# Картинки чертежа «Дно» (типы I-3 и II-1) на 3-8 полозьев из фото на 2
# полоза (dno_ii1.jpg = dno.png, 2008x1212). Силуэт - в точности как на фото,
# меняется только число полозьев: торцы средних полозьев - копии торца
# заднего, сдвинутые равными шагами к торцу переднего; сверху их закрывает
# торцовый брус (по нижней кромке его торца), спереди - передний полоз.
# Координаты ниже сняты с фото (центры линий). Если фото заменят -
# координаты нужно снять заново.
#
# Запуск: python3 tools/make_dno_images.py <фото> <папка для картинок>
# Результат: dno_3skids.png ... dno_8skids.png (оттенки серого, 16 уровней -
# в 3-4 раза легче JPEG, вид тот же).
import sys
from PIL import Image, ImageDraw
SRC, OUT = sys.argv[1], sys.argv[2]
photo = Image.open(SRC).convert('RGB')
W, H = photo.size
S = 4  # суперсэмплинг для сглаживания
A, B, C, D = (30.5, 720), (118.5, 767), (118.5, 834.5), (30.5, 784.5)  # торец заднего полоза
SHIFT = (634, 357.5)                       # задний торец -> передний
U_SIDE = (1, -0.5375)                      # вдоль полоза (нижняя кромка боковой грани)
U_TOP = (1, -0.6)                          # вдоль полоза (задняя кромка верха)
LINE_W = 8.5
beam_y = lambda x: 750 + 0.564 * (x - 160) + 4.6     # ниже этой линии брус не закрывает
front_top = lambda x: 1078 - 0.6 * (x - 664.5) - 4.6 # выше неё - передний полоз (его и перерисуем)

def block(t):
    add = lambda p, v, k=1: (p[0] + v[0] * k + t[0], p[1] + v[1] * k + t[1])
    a, b, c, d = [add(p, (0, 0)) for p in (A, B, C, D)]
    L = 500
    top = [a, b, (b[0] + L, b[1] - 0.5375 * L), (a[0] + L, a[1] - 0.6 * L)]
    side = [b, c, (c[0] + L, c[1] - 0.5375 * L), (b[0] + L, b[1] - 0.5375 * L)]
    end = [a, b, c, d]
    return [top, side, end]

def render(n):
    layer = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
    dr = ImageDraw.Draw(layer)
    for k in range(1, n - 1):  # сзади вперёд
        t = (SHIFT[0] * k / (n - 1), SHIFT[1] * k / (n - 1))
        for poly in block(t):
            pts = [(x * S, y * S) for x, y in poly]
            dr.polygon(pts, fill=(255, 255, 255, 255))
            for i in range(len(pts)):
                p, q = pts[i], pts[(i + 1) % len(pts)]
                dr.line([p, q], fill=(0, 0, 0, 255), width=int(LINE_W * S))
                r = LINE_W * S / 2
                dr.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=(0, 0, 0, 255))
    # маска видимости: ниже нижней кромки бруса и не на переднем полозе
    mask = Image.new('L', (W * S, H * S), 0)
    md = ImageDraw.Draw(mask)
    vis = [(0, beam_y(0) * S), (W * S, beam_y(W) * S), (W * S, H * S), (0, H * S)]
    md.polygon(vis, fill=255)
    front = [(659 * S, front_top(659) * S), (W * S, front_top(W) * S), (W * S, H * S), (659 * S, H * S)]
    md.polygon(front, fill=0)
    alpha = Image.composite(layer.getchannel('A'), Image.new('L', layer.size, 0), mask)
    layer.putalpha(alpha)
    layer = layer.resize((W, H), Image.LANCZOS)
    out = photo.copy()
    out.paste(layer, (0, 0), layer)
    return out

for n in range(3, 9):
    render(n).convert('L').quantize(16).save(f'{OUT}/dno_{n}skids.png', optimize=True)
print('ok')
