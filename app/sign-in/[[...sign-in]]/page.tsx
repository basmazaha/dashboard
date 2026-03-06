// app/sign-in/[[...sign-in]]/page.tsx   ← لازم المسار يكون كده عشان Clerk يتعامل مع الـ catch-all

import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8f9fa',
      padding: '1rem',
    }}>
      <SignIn 
        appearance={{
          // اختياري: تخصيص بسيط إذا أردتي
          elements: {
            rootBox: { width: '100%', maxWidth: '420px' },
          }
        }}
        
      />
    </div>
  );
}
