"""Bundle the Expo web export into one self-contained page for GitHub Pages at /<base>/."""
import base64, glob, os, re, sys

web, out, base, site = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]  # base like /Coveredly, site like https://x.github.io/Coveredly/
js = open(glob.glob(os.path.join(web, '_expo/static/js/web/entry-*.js'))[0], encoding='utf-8').read()

USED = ['Inter_400Regular.', 'Inter_500Medium.', 'Inter_600SemiBold.', 'Inter_700Bold.',
        'Fraunces_600SemiBold.', 'Fraunces_600SemiBold_Italic.', '/Ionicons.']
n = 0
for url in sorted(set(re.findall(r'"((?:%s)?/assets/[^"]+\.ttf)"' % re.escape(base), js))):
    if any(u in url for u in USED):
        local = url[len(base):] if url.startswith(base) else url
        data = base64.b64encode(open(os.path.join(web, local.lstrip('/')), 'rb').read()).decode()
        js = js.replace('"%s"' % url, '"data:font/ttf;base64,%s"' % data)
        n += 1
js = js.replace('</script', '<\\/script')

title = 'Coveredly: Insurance. Made Human.'
desc = ('Live demo of Coveredly, a two-sided app that matches New Jersey policyholders with one licensed '
        'insurance agent by communication style, coverage needs and location. Includes an agent CRM, '
        'policyholder profile and admin dashboard.')
page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#F7E3D0">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{site}">
<meta property="og:image" content="{site}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="627">
<meta name="twitter:card" content="summary_large_image">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="icon" type="image/png" href="{site}favicon.png">
<style>
  html, body {{ height: 100%; margin: 0; background: #F7E3D0; color: #141414; }}
  body {{ overflow: hidden; }}
  #root {{ display: flex; height: 100%; flex: 1; }}
</style>
</head>
<body>
<noscript>Coveredly needs JavaScript to run.</noscript>
<div id="root"></div>
<script>
  // Always start inside {base}/ (handles a lowercase or missing path).
  try {{ if (location.pathname.indexOf('{base}') !== 0) history.replaceState(null, '', '{base}/'); }} catch (e) {{}}
</script>
<script>
{js}
</script>
</body>
</html>
"""
open(out, 'w', encoding='utf-8').write(page)
print('fonts inlined:', n, ' size MB:', round(len(page.encode()) / 1e6, 2))
