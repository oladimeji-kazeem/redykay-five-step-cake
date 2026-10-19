CREATE TABLE public.order_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255),
  phone text CHECK (char_length(phone) <= 40),
  occasion text NOT NULL CHECK (char_length(occasion) <= 50),
  event_date date NOT NULL,
  guests text CHECK (char_length(guests) <= 30),
  budget text NOT NULL CHECK (char_length(budget) <= 50),
  flavours text[] NOT NULL DEFAULT '{}',
  dietary text[] NOT NULL DEFAULT '{}',
  fulfilment text CHECK (char_length(fulfilment) <= 30),
  notes text CHECK (char_length(notes) <= 2000),
  inspiration_paths text[] NOT NULL DEFAULT '{}'
);
GRANT INSERT ON public.order_requests TO anon, authenticated;
GRANT ALL ON public.order_requests TO service_role;
ALTER TABLE public.order_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit an order request" ON public.order_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000)
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can send a contact message" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can upload inspiration images" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'inspiration');