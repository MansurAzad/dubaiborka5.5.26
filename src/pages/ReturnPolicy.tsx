import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/seo/SEOHead";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import { Shield, RotateCcw, Clock, CheckCircle, XCircle, Phone } from "lucide-react";

const policies = [
  {
    icon: <Clock className="w-6 h-6 text-primary" />,
    title: "Return Window",
    description: "Return requests must be submitted within 3 days of receiving the product.",
  },
  {
    icon: <CheckCircle className="w-6 h-6 text-primary" />,
    title: "Eligible for Return",
    items: [
      "Defective or damaged products",
      "Wrong product delivered",
      "Size doesn't fit (unused with tags)",
      "Product doesn't match description",
    ],
  },
  {
    icon: <XCircle className="w-6 h-6 text-destructive" />,
    title: "Not Eligible for Return",
    items: [
      "Used or washed products",
      "Products without tags",
      "Custom orders or special designs",
      "Sale/clearance items",
      "Undergarments & hijab pins",
    ],
  },
];

const steps = [
  { step: "1", text: "Contact our customer service" },
  { step: "2", text: "Fill out the return request form" },
  { step: "3", text: "Package the product and send via courier" },
  { step: "4", text: "Receive refund/exchange after product inspection" },
];

const ReturnPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Return & Refund Policy" description="Learn about Dubai Borka House's detailed return and refund policy." canonical="/return-policy" />
      <Header />
      <Breadcrumbs />
      <main className="pt-4 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Return & Refund Policy</h1>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Your satisfaction is our top priority. If there's an issue with your product, we're here to help.
            </p>
          </div>

          <div className="space-y-8">
            {policies.map((policy, i) => (
              <div key={i} className="card-luxury">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">{policy.icon}</div>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-foreground mb-2">{policy.title}</h2>
                    {policy.description && <p className="text-muted-foreground">{policy.description}</p>}
                    {policy.items && (
                      <ul className="space-y-2 mt-2">
                        {policy.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-muted-foreground">
                            <span className="text-primary mt-1">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="card-luxury">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1"><RotateCcw className="w-6 h-6 text-primary" /></div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground mb-4">Return Process</h2>
                  <div className="space-y-4">
                    {steps.map((s) => (
                      <div key={s.step} className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">{s.step}</div>
                        <p className="text-muted-foreground">{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card-luxury bg-gradient-to-br from-primary/5 to-accent/5">
              <h2 className="font-display text-lg font-semibold text-foreground mb-3">Refund Information</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Refund processing takes 5-7 business days</li>
                <li>• Refunds are issued via bKash/Nagad</li>
                <li>• Shipping charges are non-refundable (except for our errors)</li>
                <li>• For exchanges, additional charges or refunds will be applied as needed</li>
              </ul>
            </div>

            <div className="text-center py-6">
              <p className="text-muted-foreground mb-3">For any questions, contact us</p>
              <div className="flex items-center justify-center gap-2 text-primary font-medium">
                <Phone className="w-4 h-4" />
                +880 1845-853634
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ReturnPolicy;
