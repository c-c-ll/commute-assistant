import json, urllib.request
key = "be7d5d77e21e5d17bc60723603bd5ab7"
import time
now = time.strftime("%Y%m%d%H%M")
url = f"https://restapi.amap.com/v3/direction/transit/integrated?key={key}&origin=116.346951,40.033679&destination=116.322777,39.629935&city=北京&strategy=0&nightflag=0&time={now}"
r = urllib.request.urlopen(url)
d = json.loads(r.read())
t = d["route"]["transits"][0]
s = t["segments"][0]
b = s.get("bus", {})
lines = b.get("buslines", [])
if lines:
    l = lines[0]
    for k in sorted(l.keys()):
        print(f"  {k}: {l[k]}")
