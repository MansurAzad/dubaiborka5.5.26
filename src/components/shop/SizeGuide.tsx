import { Ruler } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";

const defaultSizeData = [
  { size: '50"', chest: "32-34", waist: "24-26", hip: "34-36", length: "50" },
  { size: '52"', chest: "34-36", waist: "26-28", hip: "36-38", length: "52" },
  { size: '54"', chest: "38-40", waist: "30-32", hip: "40-42", length: "54" },
  { size: '56"', chest: "42-44", waist: "34-36", hip: "44-46", length: "56" },
  { size: '58"', chest: "46-48", waist: "38-40", hip: "48-50", length: "58" },
  { size: '60"', chest: "50-52", waist: "42-44", hip: "52-54", length: "60" },
];

interface SizeGuideProps {
  trigger?: React.ReactNode;
  sizes?: string[];
  category?: string;
}

const SizeGuide = ({ trigger, sizes, category }: SizeGuideProps) => {
  // If product has specific sizes from variants, highlight them in the guide
  const hasDynamicSizes = sizes && sizes.length > 0;
  const dynamicSizeSet = new Set(sizes?.map(s => s.replace(/"/g, "").trim()) || []);

  // Check if sizes are numeric (like 50, 52, 54) or named (S, M, L, XL)
  const isNamedSizes = hasDynamicSizes && sizes!.some(s => /^(XS|S|M|L|XL|XXL|XXXL|Free)/i.test(s));

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <button className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <Ruler className="w-4 h-4" />
            সাইজ গাইড
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">সাইজ গাইড</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {category ? `${category} — ` : ""}সকল মাপ ইঞ্চিতে দেওয়া হয়েছে
          </DialogDescription>
        </DialogHeader>

        {isNamedSizes ? (
          // Named sizes table (S, M, L, etc.)
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-3 text-left text-primary font-semibold">সাইজ</th>
                  <th className="py-3 px-3 text-center text-muted-foreground font-medium">বুক (ইঞ্চি)</th>
                  <th className="py-3 px-3 text-center text-muted-foreground font-medium">দৈর্ঘ্য (ইঞ্চি)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { size: "S", chest: "32-34", length: "50-52" },
                  { size: "M", chest: "34-36", length: "52-54" },
                  { size: "L", chest: "38-40", length: "54-56" },
                  { size: "XL", chest: "42-44", length: "56-58" },
                  { size: "XXL", chest: "46-48", length: "58-60" },
                  { size: "XXXL", chest: "50-52", length: "60-62" },
                  { size: "Free", chest: "32-48", length: "50-58" },
                ]
                  .filter(row => !hasDynamicSizes || dynamicSizeSet.has(row.size))
                  .map((row) => (
                    <tr key={row.size} className={`border-b border-border/50 transition-colors ${
                      dynamicSizeSet.has(row.size) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                    }`}>
                      <td className="py-3 px-3 font-semibold text-foreground">{row.size}</td>
                      <td className="py-3 px-3 text-center text-muted-foreground">{row.chest}</td>
                      <td className="py-3 px-3 text-center text-muted-foreground">{row.length}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Numeric sizes table (50", 52", etc.)
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-3 text-left text-primary font-semibold">সাইজ</th>
                  <th className="py-3 px-3 text-center text-muted-foreground font-medium">বুক</th>
                  <th className="py-3 px-3 text-center text-muted-foreground font-medium">কোমর</th>
                  <th className="py-3 px-3 text-center text-muted-foreground font-medium">হিপ</th>
                  <th className="py-3 px-3 text-center text-muted-foreground font-medium">দৈর্ঘ্য</th>
                </tr>
              </thead>
              <tbody>
                {defaultSizeData.map((row) => {
                  const sizeNum = row.size.replace(/"/g, "");
                  const isAvailable = hasDynamicSizes ? dynamicSizeSet.has(sizeNum) || dynamicSizeSet.has(row.size) : true;
                  return (
                    <tr key={row.size} className={`border-b border-border/50 transition-colors ${
                      hasDynamicSizes && isAvailable ? "bg-primary/5 hover:bg-primary/10" : hasDynamicSizes ? "opacity-40" : "hover:bg-muted/30"
                    }`}>
                      <td className="py-3 px-3 font-semibold text-foreground">
                        {row.size}
                        {hasDynamicSizes && isAvailable && (
                          <span className="ml-1 text-[10px] text-primary">✓</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-muted-foreground">{row.chest}"</td>
                      <td className="py-3 px-3 text-center text-muted-foreground">{row.waist}"</td>
                      <td className="py-3 px-3 text-center text-muted-foreground">{row.hip}"</td>
                      <td className="py-3 px-3 text-center text-muted-foreground">{row.length}"</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 <strong className="text-foreground">টিপ:</strong> সঠিক মাপের জন্য শরীরের উপর পরিমাপ নিন, পোশাকের উপর নয়। দুই সাইজের মধ্যে থাকলে বড় সাইজ নিন।
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SizeGuide;
