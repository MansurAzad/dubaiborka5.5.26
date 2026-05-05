
-- Create chat_histories table to store customer chat conversations
CREATE TABLE public.chat_histories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  products_discussed JSONB DEFAULT '[]'::jsonb,
  order_total NUMERIC,
  order_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_histories ENABLE ROW LEVEL SECURITY;

-- Only admins can view chat histories
CREATE POLICY "Admins can manage chat histories"
  ON public.chat_histories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow anonymous inserts from edge function (service role will be used)
CREATE POLICY "Service can insert chat histories"
  ON public.chat_histories FOR INSERT
  WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_chat_histories_order_id ON public.chat_histories(order_id);
CREATE INDEX idx_chat_histories_created_at ON public.chat_histories(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_chat_histories_updated_at
  BEFORE UPDATE ON public.chat_histories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
