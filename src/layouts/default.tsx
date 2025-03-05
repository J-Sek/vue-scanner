import type { FC } from "hono/jsx";

const Layout: FC = (props) => {
  return (
    <html>
      <head>
        <link rel="shortcut icon" href="/favicon.ico" />
        <style>{`
          @import url(https://fonts.bunny.net/css?family=bricolage-grotesque:400|dm-mono:400);
          html { font-family: Bricolage Grotesque, sans-serif }
          ul, pre, code { font-family: DM Mono, monospace }
          body { background: #151215; color:#ddd }
          h2 { padding: 16px 20px 0; position: relative }
          ul { list-style: none; padding: 0 20px }
          li { padding: .5rem 1rem; background: rgba(255,255,255,.05); border-radius: 8px; margin: 6px 0 }
          pre:first-child { margin: 0 }
          pre { margin: .5rem 0 0; }
          a { color: #3dd7ea; text-decoration: none; border-radius: 4px; transition: all .3s ease-in-out }
          a:hover { background-color: #3dd7ea20 }
          .nav { position: absolute; top: 16px; right: 20px }
          ::selection { background: #969600; color: black; text-shadow: none; }
        `}</style>
      </head>
      <body>{props.children}</body>
    </html>
  );
};

export default Layout;