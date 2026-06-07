// Centralized permission registry for admin routes & nav menus.
// Used by AdminLayout (menu filtering), PermissionGuard (route protection),
// and RoleManagement matrix preview.

export type PermissionKey =
  | "orders.manage"
  | "orders.update_status"
  | "products.manage"
  | "customers.view"
  | "reviews.manage"
  | "chat.view"
  | "coupons.manage"
  | "shipping.manage"
  | "content.manage"
  | "reports.view"
  | "settings.manage";

export const ALL_PERMISSIONS: { key: PermissionKey; label: string; group: string }[] = [
  { key: "orders.manage", label: "Orders ম্যানেজ", group: "Orders" },
  { key: "orders.update_status", label: "Order Status আপডেট", group: "Orders" },
  { key: "products.manage", label: "Products ম্যানেজ", group: "Products" },
  { key: "customers.view", label: "Customers দেখা", group: "Customers" },
  { key: "reviews.manage", label: "Reviews ম্যানেজ", group: "Customers" },
  { key: "chat.view", label: "Chat দেখা", group: "Customers" },
  { key: "coupons.manage", label: "Coupons ম্যানেজ", group: "Marketing" },
  { key: "shipping.manage", label: "Shipping ম্যানেজ", group: "Operations" },
  { key: "content.manage", label: "Content এডিট", group: "Operations" },
  { key: "reports.view", label: "Reports দেখা", group: "Operations" },
  { key: "settings.manage", label: "Settings", group: "Operations" },
];

// Default permissions auto-granted on moderator promotion (mirrors DB trigger).
export const MODERATOR_DEFAULT_PERMISSIONS: PermissionKey[] = [
  "orders.manage",
  "orders.update_status",
  "products.manage",
  "customers.view",
  "reviews.manage",
  "chat.view",
  "coupons.manage",
  "shipping.manage",
  "content.manage",
  "reports.view",
];

// Admin-only — moderators never get these even if toggled off in trigger.
export const ADMIN_ONLY_PERMISSIONS: PermissionKey[] = ["settings.manage"];

export const PERMISSION_ACCESS_MAP: Record<PermissionKey, { pages: string[]; actions: string[]; rls: string[] }> = {
  "orders.manage": {
    pages: ["/admin/orders", "/admin/returns"],
    actions: ["সব অর্ডার দেখা", "অর্ডার স্ট্যাটাস/তথ্য আপডেট", "রিটার্ন ম্যানেজ"],
    rls: ["orders: view/update", "order_items: view", "returns: manage"],
  },
  "orders.update_status": {
    pages: ["/admin/orders"],
    actions: ["অর্ডার স্ট্যাটাস পরিবর্তনের UI অনুমতি"],
    rls: ["orders.manage নীতির সাথে status update কার্যকর"],
  },
  "products.manage": {
    pages: ["/admin/products", "/admin/categories", "/admin/bulk-edit", "/admin/bulk-add"],
    actions: ["প্রোডাক্ট/ক্যাটাগরি CRUD", "ভ্যারিয়েন্ট ও মিডিয়া ম্যানেজ", "Bulk add/edit"],
    rls: ["products: manage", "product_variants: manage", "product_images: manage", "categories: manage"],
  },
  "customers.view": {
    pages: ["/admin/customers", "/admin/segments"],
    actions: ["কাস্টমার ও প্রোফাইল দেখা", "Customer segment ম্যানেজ", "Blocked user ম্যানেজ"],
    rls: ["profiles: view", "orders: view", "customer_segments: manage", "blocked_users: manage"],
  },
  "reviews.manage": {
    pages: ["/admin/reviews"],
    actions: ["রিভিউ দেখা/মডারেট/ডিলিট"],
    rls: ["product_reviews: manage"],
  },
  "chat.view": {
    pages: ["/admin/chat-histories"],
    actions: ["চ্যাট হিস্টরি দেখা/ম্যানেজ", "চ্যাট থেকে অর্ডার তৈরি"],
    rls: ["chat_histories: manage", "orders: create/update chat orders", "order_items: create"],
  },
  "coupons.manage": {
    pages: ["/admin/coupons"],
    actions: ["কুপন তৈরি/এডিট/ডিঅ্যাক্টিভেট"],
    rls: ["coupons: manage"],
  },
  "shipping.manage": {
    pages: ["/admin/shipping", "/admin/delivery-zones", "/admin/courier-integration", "/admin/steadfast", "/admin/courier-audit"],
    actions: ["শিপিং/ট্র্যাকিং আপডেট", "ডেলিভারি জোন ম্যানেজ", "Courier submit/sync/audit"],
    rls: ["delivery_zones: manage", "courier_shipments: manage", "courier_audit_logs: view/insert"],
  },
  "content.manage": {
    pages: ["/admin/homepage", "/admin/blog", "/admin/email-campaigns", "/admin/content", "/admin/notifications", "/admin/social-proof"],
    actions: ["Homepage/content/blog/newsletter/notification ম্যানেজ"],
    rls: ["site_content: manage", "blog_posts: manage", "email_campaigns: manage", "newsletter_subscribers: manage", "social_proof_messages: manage"],
  },
  "reports.view": {
    pages: ["/admin", "/admin/reports"],
    actions: ["ড্যাশবোর্ড ও রিপোর্ট দেখা", "রিপোর্টিং ডেটা read-only"],
    rls: ["orders/order_items/products/profiles/reviews/returns/categories/coupons: view"],
  },
  "settings.manage": {
    pages: ["/admin/settings"],
    actions: ["সাইট সেটিংস ম্যানেজ"],
    rls: ["system_settings: admin-only manage"],
  },
};

// Map of admin route path → required permission. Routes not listed are admin-only.
export const ROUTE_PERMISSIONS: Record<string, PermissionKey | "admin_only"> = {
  "/admin": "reports.view",
  "/admin/homepage": "content.manage",
  "/admin/categories": "products.manage",
  "/admin/blog": "content.manage",
  "/admin/products": "products.manage",
  "/admin/orders": "orders.manage",
  "/admin/customers": "customers.view",
  "/admin/reviews": "reviews.manage",
  "/admin/coupons": "coupons.manage",
  "/admin/email-campaigns": "content.manage",
  "/admin/reports": "reports.view",
  "/admin/returns": "orders.manage",
  "/admin/shipping": "shipping.manage",
  "/admin/delivery-zones": "shipping.manage",
  "/admin/content": "content.manage",
  "/admin/segments": "customers.view",
  "/admin/notifications": "content.manage",
  "/admin/chat-histories": "chat.view",
  "/admin/bulk-edit": "products.manage",
  "/admin/bulk-add": "products.manage",
  "/admin/staff-permissions": "admin_only",
  "/admin/courier-integration": "shipping.manage",
  "/admin/steadfast": "shipping.manage",
  "/admin/courier-audit": "shipping.manage",
  "/admin/referrals": "admin_only",
  "/admin/social-proof": "content.manage",
  "/admin/backup": "admin_only",
  "/admin/cloudinary": "admin_only",
  "/admin/meta-pixel": "admin_only",
  "/admin/google-analytics": "admin_only",
  "/admin/settings": "admin_only",
};

export type PermissionStatus = "allow" | "deny" | "inherited";

export const getPermissionStatus = (
  role: "admin" | "moderator" | "user",
  permission: PermissionKey,
  granted: string[]
): PermissionStatus => {
  if (role === "admin") return "inherited"; // admin gets everything implicitly
  if (role === "user") return "deny";
  // moderator
  return granted.includes(permission) ? "allow" : "deny";
};
