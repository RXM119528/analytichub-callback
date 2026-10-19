# AnalyticHub sign-in callback page

A tiny public static page. Microsoft returns the person here after sign-in; the page forwards the authorization code to the AnalyticHub app window that opened it with `postMessage`, to an allow-listed origin only, and keeps nothing. It holds no data and no secrets.
