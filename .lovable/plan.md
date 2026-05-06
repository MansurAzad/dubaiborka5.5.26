## লক্ষ্য

1. **চ্যাটবটে ছবি আপলোড সমস্যা ফিক্স** — কেন আপলোড হচ্ছে না তা ডায়াগনোজ ও ঠিক করা।
2. **ছবি থেকে product শনাক্ত** — Gemini 2.5 Pro এর native vision ব্যবহার করে ছবি বিশ্লেষণ → DB থেকে ম্যাচিং প্রোডাক্ট বের করা।
3. **অস্থায়ী ছবি (Ephemeral Storage)** — chat upload ছবি ৫ মিনিট পরে স্বয়ংক্রিয়ভাবে স্টোরেজ ও DB থেকে মুছে যাবে।

---

## বর্তমান সমস্যার বিশ্লেষণ (কেন আপলোড হচ্ছে না)

`CustomerChatWidget.handleImageSelect` ব্যবহার করছে `uploadToCloudinary` → `supabase.functions.invoke("cloudinary-upload", { body: FormData })`। সম্ভাব্য কারণ:
- `cloudinary-upload` ফাংশনের লগ খালি — অর্থাৎ রিকোয়েস্ট পৌঁছাচ্ছে না (FormData + supabase-js invoke এ বাগ; Content-Type header অটো-সেট হয় না)।
- যেহেতু chat ছবি স্থায়ীভাবে Cloudinary তে রাখার দরকার নেই, এটি একটি অপ্রয়োজনীয় নির্ভরতা।

**সমাধান:** Chat-এর জন্য আলাদা edge function `chat-image-upload` যা সরাসরি `multipart/form-data` raw fetch দিয়ে accept করবে এবং Supabase Storage এ TTL সহ রাখবে।

---

## আর্কিটেকচার

### ১. নতুন Storage Bucket: `chat-uploads`
- Public bucket (যাতে AI vision ছবি পড়তে পারে)
- RLS: anyone can insert; only service role can read metadata
- প্রতি ছবিতে metadata: `{ uploaded_at, expires_at }`

### ২. নতুন টেবিল: `chat_uploads`
```
id uuid PK
storage_path text
public_url text
session_key text  (browser fingerprint/IP — rate limit)
created_at timestamptz default now()
expires_at timestamptz default now() + interval '5 minutes'
deleted boolean default false
```
- RLS: anyone can insert; admin can view; anyone can read own row by id
- Index on `expires_at` (cleanup query)

### ৩. নতুন Edge Function: `chat-image-upload`
- `POST /chat-image-upload` with `multipart/form-data` (field: `file`)
- Validates: max 5MB, image MIME only
- Uploads to `chat-uploads/{uuid}.{ext}`
- Inserts row in `chat_uploads`
- Returns `{ url, id, expires_at }`

### ৪. নতুন Edge Function: `chat-image-cleanup` (scheduled)
- Cron: প্রতি মিনিটে চলবে (`pg_cron`)
- Query: `expires_at < now() AND deleted = false`
- প্রতিটি row এর জন্য:
  - Storage থেকে file delete
  - DB row update: `deleted = true`, অথবা সম্পূর্ণ row delete
- Logs ফলাফল

### ৫. ছবি থেকে Product Recognition (`customer-chat` আপডেট)
বর্তমানে `find_matching_products` tool আছে যা **text description** নেয় — কিন্তু AI কেই ছবি দেখে description লিখতে হয়।

**উন্নতি:**
- Multimodal message format already passes `image_url` to Gemini 2.5 Pro ✅
- System prompt-এ যোগ: "যখন কাস্টমার ছবি পাঠায় → প্রথমে ছবিটি বিশ্লেষণ করে বিস্তারিত visual features (color, fabric type guess, embroidery style, silhouette) extract করুন → তারপর `find_matching_products` tool কল করুন ঐ description দিয়ে।"
- `find_matching_products` রেজাল্টে top-3 matches return + AI কে instruct করুন: "যদি confident match (>70% visual similarity) থাকে → ঐ product এর get_product_details কল করে পূর্ণ ছবি ও দাম দেখান। নইলে কাছাকাছি বিকল্প দেখান এবং বলুন 'হুবহু এই ছবিটি আমাদের কাছে নেই, কিন্তু কাছাকাছি এগুলো আছে।'"

### ৬. Frontend আপডেট (`CustomerChatWidget`)
- `handleImageSelect` → `cloudinary-upload` এর বদলে নতুন `chat-image-upload` কল করবে
- raw `fetch` ব্যবহার করবে (FormData এর জন্য নির্ভরযোগ্য)
- Upload সফল হলে preview + URL সেট হবে
- User কে জানানো: "এই ছবিটি ৫ মিনিটের মধ্যে স্বয়ংক্রিয়ভাবে মুছে যাবে।"

---

## ফাইল পরিবর্তন

**নতুন:**
- `supabase/functions/chat-image-upload/index.ts`
- `supabase/functions/chat-image-cleanup/index.ts`
- DB Migration: `chat_uploads` table + RLS + storage bucket + cron job

**সম্পাদনা:**
- `src/components/chat/CustomerChatWidget.tsx` — `handleImageSelect` rewrite
- `supabase/functions/customer-chat/index.ts` — system prompt update + image flow guidance

---

## সিকিউরিটি

- Rate limit: একই IP থেকে সর্বোচ্চ ১০ ছবি / ঘণ্টা
- File type whitelist: `image/jpeg, image/png, image/webp`
- Max size: 5MB
- Storage path UUID — directly guessable নয়
- Cron-driven hard delete (storage + DB) ৫ মিনিট পর

---

## টেস্ট

1. ছবি আপলোড → URL ফেরত → preview দেখা যাচ্ছে
2. ছবি সহ "এটি কী?" → AI vision বিশ্লেষণ → matching product দেখাবে
3. ৫ মিনিট পর storage এ ফাইল নেই, DB row এ deleted=true
4. ৫MB এর বেশি → reject
5. Non-image → reject
