import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/seo/SEOHead";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import StructuredData, { faqSchema } from "@/components/seo/StructuredData";
import { HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqData = [
  {
    category: "Orders & Delivery",
    questions: [
      { q: "How long does delivery take after placing an order?", a: "Within Dhaka, delivery takes 1-2 business days. Outside Dhaka, it takes 3-5 business days. During peak seasons, it may take slightly longer." },
      { q: "Is Cash on Delivery (COD) available?", a: "Yes, Cash on Delivery is available. However, partial advance payment may be required." },
      { q: "What are the delivery charges?", a: "৳60 within Dhaka and ৳120 outside Dhaka. Free delivery on orders above ৳3,000." },
      { q: "Can I track my order?", a: "Yes, after your order is confirmed, you'll receive a tracking number. You can track your order from the 'Order Tracking' page on our website." },
    ],
  },
  {
    category: "Payment",
    questions: [
      { q: "What payment methods are accepted?", a: "You can pay via bKash, Nagad, Rocket, and bank transfer." },
      { q: "Is online payment secure?", a: "Yes, we use completely secure payment gateways. Your information is protected." },
    ],
  },
  {
    category: "Products & Sizing",
    questions: [
      { q: "How do I choose the right size?", a: "Please refer to our size guide. Sizes range from 52\" to 60\". You can also use our AI Size Recommendation feature based on your height and weight." },
      { q: "Are custom sizes available?", a: "Currently we don't accept custom size orders. However, our size range from 52\" to 60\" should accommodate most needs." },
      { q: "Will the product color match the photo?", a: "We try to show the most accurate colors. However, slight variations may occur due to screen differences." },
    ],
  },
  {
    category: "Returns & Refunds",
    questions: [
      { q: "Can I return a product?", a: "Yes, you can submit a return request within 3 days of receiving the product. The product must be unused and with tags attached." },
      { q: "How long does a refund take?", a: "Refunds are processed within 5-7 business days via bKash/Nagad after the product is returned." },
    ],
  },
  {
    category: "Account",
    questions: [
      { q: "How do reward points work?", a: "You earn points on every order. Every 100 points gives you ৳10 discount. You also earn points for referrals." },
      { q: "What if I forgot my password?", a: "Click 'Forgot Password' on the login page. You'll receive a reset link via email." },
    ],
  },
];

const FAQ = () => {
  // Flatten all FAQs for structured data
  const allFaqs = faqData.flatMap((section) =>
    section.questions.map((q) => ({ question: q.q, answer: q.a }))
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="সাধারণ জিজ্ঞাসা (FAQ)" 
        description="দুবাই বোরকা হাউস সম্পর্কে সাধারণ প্রশ্ন ও উত্তর — অর্ডার, ডেলিভারি, পেমেন্ট, রিটার্ন ও সাইজিং সংক্রান্ত তথ্য।" 
        canonical="/faq" 
        keywords="দুবাই বোরকা হাউস FAQ, ডেলিভারি চার্জ, রিটার্ন পলিসি, সাইজ গাইড, অর্ডার ট্র্যাকিং, dubai borka house faq"
      />
      <StructuredData data={faqSchema(allFaqs)} />
      <Header />
      <Breadcrumbs />
      <main className="pt-4 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Frequently Asked Questions</h1>
            <p className="text-muted-foreground mt-3">Find answers to your questions here</p>
          </div>

          <div className="space-y-8">
            {faqData.map((section, i) => (
              <div key={i}>
                <h2 className="font-display text-lg font-semibold text-primary mb-3">{section.category}</h2>
                <Accordion type="single" collapsible className="card-luxury divide-y divide-border">
                  {section.questions.map((item, j) => (
                    <AccordionItem key={j} value={`${i}-${j}`} className="border-0">
                      <AccordionTrigger className="text-left text-foreground hover:no-underline px-1">{item.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground px-1">{item.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
