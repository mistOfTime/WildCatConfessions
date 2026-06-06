# 🐱 Wildcat Confessions

A anonymous confession platform built for students, strangers, and everyone in between. Share your thoughts, spill the tea, and connect with your campus community — no names required.

**Live:** [wild-cat-confessions.vercel.app](https://wild-cat-confessions.vercel.app)

---

## Features

- 🔒 **Anonymous posting** — post without revealing your identity, or go public if you want
- 🎭 **Wildcat identity** — anonymous users get a unique `Wildcat####` name per post
- 📸 **Photo posts** — upload up to 5 images per confession with a lightbox gallery
- 🎵 **Music** — attach a song from iTunes to your post with a 30-second preview
- ❤️ **Reactions** — heart, thumbs up, laugh, wow, sad — one reaction per user
- 💬 **Comments** — threaded replies with anonymous identities
- 🔖 **Save posts** — bookmark any confession to your personal saved list
- 🔁 **Categories** — filter confessions by Crushes, Rants, Tea, Memes, Academic, Other
- 📌 **Pin posts** — admin can pin important posts to the top of the feed
- 🔍 **Search** — search confessions by content in real time
- 📊 **Trending** — posts with 10+ reactions appear in the trending sidebar
- 🛡️ **Moderation** — admin dashboard to review, approve, reject, or delete flagged posts
- 🗑️ **Delete own posts** — users can delete their own confessions
- 👤 **Profile customization** — change display name, avatar photo, and color
- 🌐 **Cross-device sync** — profile photo and name sync across all devices via Firestore

---

## Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Firebase (Firestore, Authentication)
- **Deployment:** Vercel
- **Music API:** iTunes Search API (free, no key required)

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/mistOfTime/WildCatConfessions.git

# Install dependencies
cd WildCatConfessions
npm install

# Add your Firebase config to .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Run development server
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) in your browser.

---

## Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /confessions/{confessionId} {
      allow read, write: if request.auth != null;
      match /comments/{commentId} {
        allow read, write: if request.auth != null;
      }
      match /userReactions/{userId} {
        allow read, write: if request.auth != null;
      }
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /savedPosts/{postId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    match /{path=**}/comments/{commentId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## License

MIT — free to use and modify.
