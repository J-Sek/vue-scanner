import type { FC } from "hono/jsx";

const Layout: FC = (props) => {
  return (
    <html>
      <head>
        <link rel="shortcut icon" href="/favicon.ico" />
        <style>{`
          @import url(https://fonts.bunny.net/css?family=syne:400);
          html { font-family: Syne, sans-serif }
          body { background: #151215; color:#ddd }
          li { padding: .5rem 1rem; background: rgba(255,255,255,.05) }
          li + li { border-top: thin solid rgba(255,255,255,.2) }
          pre:first-child { margin: 0 }
          pre { margin: .5rem 0 0; font-family: MonoLisa, monospace }
          code { margin: .5rem 0 0; font-family: MonoLisa, monospace }
          a { color: #3dd7ea }
          a:not(:hover) { text-decoration: none }
        `}</style>
      </head>
      <body>{props.children}</body>
    </html>
  );
};

export default Layout;