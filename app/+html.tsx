import { type PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

const favicon = require('../assets/favicon.png');
const icon192 = require('../assets/icon-192.png');
const icon512 = require('../assets/icon-512.png');
const appleTouchIcon = require('../assets/apple-touch-icon.png');

export default function Html({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#090B08" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ironline" />
        <link rel="icon" type="image/png" sizes="48x48" href={favicon} />
        <link rel="icon" type="image/png" sizes="192x192" href={icon192} />
        <link rel="icon" type="image/png" sizes="512x512" href={icon512} />
        <link rel="apple-touch-icon" sizes="180x180" href={appleTouchIcon} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
