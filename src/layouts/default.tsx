import type { FC } from "hono/jsx";

const Layout: FC = (props) => {
  return (
    <html>
      <head>
        <link rel="shortcut icon" href="/favicon.ico" />
        <style>{`
          @import url(https://fonts.bunny.net/css?family=syne:400|dm-mono:400);
          html { font-family: Syne, sans-serif }
          ul, pre, code { font-family: DM Mono, monospace }
          body { background: #151215; color:#ddd }
          h2 { padding: 16px 20px 0 }
          ul { list-style: none; padding: 0 20px }
          li { padding: .5rem 1rem; background: rgba(255,255,255,.05); border-radius: 8px; margin: 6px 0 }
          pre:first-child { margin: 0 }
          pre { margin: .5rem 0 0; }
          a { color: #3dd7ea }
          a:not(:hover) { text-decoration: none }
        `}</style>
      </head>
      <body>{props.children}</body>
    </html>
  );
};

export default Layout;