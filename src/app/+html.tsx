import { ScrollViewStyleReset } from "expo-router/html";
import React from "react";

const isTelegramTarget = process.env.EXPO_PUBLIC_TARGET === "telegram";

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {isTelegramTarget && (
          <script src="https://telegram.org/js/telegram-web-app.js" defer />
        )}

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
