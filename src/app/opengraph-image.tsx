import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Wildcat Confessions';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#7c1d2e',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background circles */}
        <div style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: '#6b1826', opacity: 0.5 }} />
        <div style={{ position: 'absolute', bottom: -100, right: -100, width: 500, height: 500, borderRadius: '50%', background: '#6b1826', opacity: 0.5 }} />

        {/* Logo */}
        <div style={{
          width: 120, height: 120, borderRadius: '50%', background: '#f5a623',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 32, fontSize: 72, fontWeight: 900, color: '#7c1d2e',
        }}>
          W
        </div>

        {/* Title */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 80, fontWeight: 900, color: 'white' }}>Wildcat</span>
          <span style={{ fontSize: 80, fontWeight: 900, color: '#f5a623' }}>Confessions</span>
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.75)', textAlign: 'center', maxWidth: 800 }}>
          A space for everyone. Students, strangers, and everyone in between.
        </div>
      </div>
    ),
    { ...size }
  );
}
