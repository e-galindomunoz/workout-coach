import { type PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';
import { colors } from '../lib/theme';

export default function Html({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* maximum-scale=1 prevents iOS auto-zoom; viewport-fit=cover fills safe areas */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#090B08" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ironline" />
        {/* manifest link is required for iOS to honour scope/standalone on nav */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        {/* Apple touch icon must be a static path — require() returns [object Object] */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <style>{`
          :root {
            color-scheme: dark;
            background: ${colors.background};
          }

          html,
          body,
          #root {
            width: 100%;
            margin: 0;
            padding: 0;
            background: ${colors.background};
            overflow-x: hidden;
          }

          html {
            min-height: 100%;
            /* Prevent iOS elastic overscroll from moving fixed elements */
            overscroll-behavior: none;
          }

          body {
            /* layered min-height: browser uses last value it understands */
            min-height: 100vh;
            min-height: -webkit-fill-available;
            min-height: 100dvh;
            /* Prevent bounce scroll that causes fixed nav to jump on iOS PWA */
            overscroll-behavior-y: none;
            overscroll-behavior-x: none;
          }

          #root {
            min-height: 100vh;
            min-height: 100dvh;
          }

          body > div {
            min-height: 100vh;
            min-height: 100dvh;
            background: ${colors.background};
          }
        `}</style>
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
