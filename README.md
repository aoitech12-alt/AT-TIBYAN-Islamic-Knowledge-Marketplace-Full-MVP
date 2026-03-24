# AT-TIBYAN — Islamic Knowledge Marketplace

A modern freelance & learning platform for Islamic knowledge. Built with React + Vite.

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env
# Edit .env with your Supabase keys (optional — app works without them in demo mode)

# 3. Start development server
npm run dev
# Opens at http://localhost:5173
```

## Deploy to Vercel (Recommended — Free)

**Easiest option. 2 minutes. Free SSL + custom domain.**

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit — AT-TIBYAN platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/at-tibyan.git
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **"New Project"**
3. Import your `at-tibyan` repository
4. Framework Preset: **Vite** (auto-detected)
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Click **"Deploy"**

### Step 3: Add Environment Variables (Optional)
1. In Vercel dashboard → your project → **Settings** → **Environment Variables**
2. Add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
3. Redeploy

### Step 4: Custom Domain
1. Settings → Domains → Add `attibyan.com` (or your domain)
2. Update DNS at your registrar (Vercel gives you the records)

**Your site is live at `https://at-tibyan.vercel.app`**

---

## Deploy to Netlify (Also Free)

1. Go to [netlify.com](https://netlify.com) → Sign up
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect GitHub → Select `at-tibyan` repo
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Click **"Deploy site"**

The `netlify.toml` file in this project handles SPA routing automatically.

---

## Deploy to Railway (Backend + Frontend)

If you need a backend server later:

1. Go to [railway.app](https://railway.app) → Sign up
2. New Project → Deploy from GitHub repo
3. Railway auto-detects Vite and deploys

---

## Deploy to a VPS (DigitalOcean, Hetzner, AWS)

```bash
# On your server:
git clone https://github.com/YOUR_USERNAME/at-tibyan.git
cd at-tibyan
npm install
npm run build

# Serve with Nginx
sudo apt install nginx
sudo cp dist/* /var/www/html/
```

Nginx config (`/etc/nginx/sites-available/attibyan`):
```nginx
server {
    listen 80;
    server_name attibyan.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Then add SSL with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d attibyan.com
```

---

## Supabase Setup (When Ready)

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **anon key**
3. Add to `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```

### 2. Create Database Tables
Run this SQL in Supabase SQL Editor:

```sql
-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  phone TEXT,
  location TEXT,
  bio TEXT,
  specialty TEXT,
  avatar_url TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses (Learning Tracks)
CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  icon TEXT DEFAULT '📖',
  color TEXT DEFAULT '#2D6A4F',
  category TEXT DEFAULT 'quran',
  is_published BOOLEAN DEFAULT FALSE,
  enrolled_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sections
CREATE TABLE sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lectures
CREATE TABLE lectures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'video' CHECK (type IN ('video', 'quiz', 'exercise', 'text')),
  video_url TEXT,
  duration TEXT,
  "order" INTEGER DEFAULT 0,
  is_preview BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrollments
CREATE TABLE enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  course_id UUID REFERENCES courses(id),
  progress INTEGER DEFAULT 0,
  completed_lectures UUID[] DEFAULT '{}',
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- Job Requests (with admin approval)
CREATE TABLE job_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  budget TEXT,
  category TEXT,
  urgent BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  proposals_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  course_id UUID REFERENCES courses(id),
  amount_usd DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  barakah_fund DECIMAL(10,2) DEFAULT 0,
  type TEXT CHECK (type IN ('order', 'tip', 'pro_subscription', 'boost', 'featured')),
  provider TEXT,
  provider_ref TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Enable Row Level Security
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Public profiles readable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Courses: everyone reads published, admin writes
CREATE POLICY "Published courses readable" ON courses FOR SELECT USING (is_published = true);
CREATE POLICY "Admin manages courses" ON courses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Sections/Lectures: readable, admin writes
CREATE POLICY "Sections readable" ON sections FOR SELECT USING (true);
CREATE POLICY "Admin manages sections" ON sections FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Lectures readable" ON lectures FOR SELECT USING (true);
CREATE POLICY "Admin manages lectures" ON lectures FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Enrollments: users manage own
CREATE POLICY "Users manage own enrollments" ON enrollments FOR ALL USING (auth.uid() = user_id);

-- Job requests: approved visible to all, own pending visible
CREATE POLICY "Approved jobs visible" ON job_requests FOR SELECT USING (status = 'approved' OR user_id = auth.uid());
CREATE POLICY "Users create own jobs" ON job_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manages job status" ON job_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Payments: users read own
CREATE POLICY "Users read own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
```

### 4. Create Storage Buckets
In Supabase dashboard → Storage:
1. Create bucket `avatars` (Public)
2. Create bucket `course-media` (Public)
3. Create bucket `recitations` (Private)

---

## Project Structure

```
at-tibyan/
├── index.html          # Entry point
├── package.json        # Dependencies
├── vite.config.js      # Vite configuration
├── vercel.json         # Vercel SPA routing
├── netlify.toml        # Netlify SPA routing
├── .env.example        # Environment variables template
├── .gitignore
└── src/
    ├── main.jsx        # React mount point
    └── App.jsx         # Entire application (single-file MVP)
```

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: CSS-in-JS (inline styles with CSS variables)
- **Fonts**: Outfit + Amiri (Google Fonts)
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Payments**: Paystack / Stripe (add when ready)
- **Hosting**: Vercel / Netlify (free tier)

## License

MIT
