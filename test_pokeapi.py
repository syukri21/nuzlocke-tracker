import urllib.request
import json

def check_url(url):
    try:
        urllib.request.urlopen(url)
        return True
    except Exception as e:
        return False

names = ["pidgey", "rattata", "spearow", "rowlet"]
for name in names:
    url = f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{name}.png"
    print(f"{name}: {url} -> {check_url(url)}")

