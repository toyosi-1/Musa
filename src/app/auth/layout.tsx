export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Fixed full-bleed dark background — covers the ENTIRE screen
          including iOS safe areas at top (notch) and bottom (home bar),
          so no white body bleeds through on iPhone */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: '#080d1a',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </>
  );
}
