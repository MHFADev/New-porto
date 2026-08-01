import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'M. Hilmi Firjatullah Adi — IT Support & Full-Stack Developer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const geist = await readFile(join(process.cwd(), 'node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf'));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#171113',
          color: '#F1EBE1',
          fontFamily: 'Geist',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -160,
            right: -140,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(232,69,43,0.28) 0%, rgba(232,69,43,0) 68%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -220,
            left: -160,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(201,113,79,0.18) 0%, rgba(201,113,79,0) 68%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              background: '#4ADE80',
            }}
          />
          <div style={{ fontSize: 22, letterSpacing: 6, color: '#A99E90' }}>
            AVAILABLE FOR WORK — IT SUPPORT & DEVELOPMENT
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>
            M. Hilmi
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: -2,
              background: 'linear-gradient(100deg, #E8452B 10%, #C9714F 90%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Firjatullah Adi
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #2A2126',
            paddingTop: 32,
            fontSize: 26,
            color: '#A99E90',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#E8452B' }}>~/hilmi</span>
            <span>·</span>
            <span>Kendari, Indonesia</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#E8452B' }}>hilmi</span>
            <span>.my.id</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Geist', data: geist, weight: 400 }] }
  );
}
