# More games at ti84calcwiz.com
h='quit'
g='lose'
f=Exception
Y='win'
X='max_wrong'
W=False
V=range
Q=len
P=print
I='wrong'
H='guessed'
G=str
F='won'
E='word'
D=True
C='done'
import random as i
try:import ti_draw as A,ti_system as J;N=D
except ImportError:
	import sys
	if sys.implementation.name=='tipython':P('This program needs ti_draw,');P('which your calculator is');P('missing. 2-minute fix:');P('calcplex.com/ti-draw-fix');raise SystemExit
	N=W
__poll=1
try:J.get_key
except AttributeError:
	def __key(w=0):return J.wait_key()
	J.get_key=__key
	__poll=0
j=6
Z=[('FOOD',['PIZZA','BURGER','TACO','NACHOS','RAMEN','SUSHI','BAGEL','DONUT','WAFFLE','PANCAKE','PRETZEL','POPCORN','NUGGET','KETCHUP','MUSTARD','PICKLE','BURRITO','QUESADILLA','LASAGNA','SPAGHETTI','MEATBALL','SANDWICH','SMOOTHIE','MILKSHAKE','BROWNIE','CUPCAKE','CHURRO','SLUSHIE','GUACAMOLE','CORNDOG']),('ANIMAL',['PLATYPUS','OCTOPUS','PENGUIN','GIRAFFE','DOLPHIN','RACCOON','SQUIRREL','HAMSTER','FERRET','IGUANA','GECKO','NARWHAL','WOMBAT','SLOTH','KOALA','CHEETAH','JAGUAR','FALCON','PYTHON','COBRA','MANTIS','FIREFLY','JELLYFISH','STINGRAY','WALRUS','MOOSE','BADGER','HEDGEHOG','AXOLOTL','CAPYBARA']),('SPORTS',['BASKETBALL','FOOTBALL','SOCCER','BASEBALL','VOLLEYBALL','TENNIS','HOCKEY','LACROSSE','WRESTLING','SKATEBOARD','SNOWBOARD','SURFING','BOWLING','ARCHERY','KARATE','DODGEBALL','TOUCHDOWN','SLAMDUNK','HOMERUN','PENALTY','OVERTIME','CHAMPION','TROPHY','REFEREE','STADIUM','VARSITY','PLAYOFFS','MARATHON','GYMNAST','SHUTOUT']),('SCHOOL',['HOMEWORK','LOCKER','CAFETERIA','DETENTION','ALGEBRA','CHEMISTRY','BIOLOGY','HISTORY','ESSAY','BACKPACK','PENCIL','ERASER','WHITEBOARD','PRINCIPAL','SUBSTITUTE','TARDY','RECESS','SEMESTER','MIDTERM','FINALS','DIPLOMA','PROM','YEARBOOK','HALLWAY','BLEACHERS','FUNDRAISER','PROJECTOR','GYMNASIUM','LIBRARY','POPQUIZ']),('TECH',['WIFI','LAPTOP','CHARGER','BLUETOOTH','PODCAST','STREAMING','HASHTAG','EMOJI','SELFIE','MEME','GLITCH','UPLOAD','PASSWORD','BROWSER','KEYBOARD','JOYSTICK','CONSOLE','ARCADE','PIXEL','ROBOT','DRONE','HEADPHONES','CAMERA','SCREENSHOT','SPAM','FIREWALL','AVATAR','AIRDROP','SPEEDRUN','MINECRAFT']),('MOVIES',['ZOMBIE','VAMPIRE','WIZARD','SUPERHERO','VILLAIN','SIDEKICK','SEQUEL','TRAILER','CINEMA','ACTOR','DIRECTOR','CARTOON','ANIME','SITCOM','COMEDY','MUSICAL','PREMIERE','BLOOPER','STUNTMAN','DINOSAUR','PIRATE','NINJA','ALIEN','MONSTER','DRAGON','KRAKEN','WEREWOLF','JUMPSCARE','PLOTTWIST','SPOILER']),('MUSIC',['GUITAR','DRUMMER','PLAYLIST','CONCERT','ENCORE','CHORUS','REMIX','AUTOTUNE','BEATBOX','KARAOKE','TRUMPET','SAXOPHONE','VIOLIN','UKULELE','ORCHESTRA','RAPPER','MIXTAPE','VINYL','FESTIVAL','LYRICS','MELODY','RHYTHM','ACOUSTIC','BASSLINE','FALSETTO','SOPRANO','MAESTRO','JUKEBOX','BANJO','HARMONICA']),('SPACE',['GALAXY','PLANET','COMET','ASTEROID','METEOR','NEBULA','ORBIT','GRAVITY','ECLIPSE','SATELLITE','ROCKET','ASTRONAUT','TELESCOPE','SUPERNOVA','BLACKHOLE','CRATER','MARTIAN','COSMOS','STARDUST','JUPITER','SATURN','NEPTUNE','MERCURY','URANUS','PLUTO','LAUNCHPAD','SPACESUIT','MOONWALK','LIGHTYEAR','OBSERVATORY'])]
R=[B for(C,A)in Z for B in A]
a={}
for(k,l)in Z:
	for m in l:a[m]=k
def n(word):return{E:word.upper(),H:set(),I:0,X:j,C:W,F:W}
def o(st,ch):
	B=ch;A=st
	if A[C]:return'noop'
	B=B.upper()
	if B in A[H]:return'dup'
	A[H].add(B)
	if B in A[E]:
		if all(B in A[H]for B in A[E]):A[F]=D;A[C]=D;return Y
		return'hit'
	A[I]+=1
	if A[I]>=A[X]:A[C]=D;return g
	return'miss'
def p(st):return' '.join(A if A in st[H]else'_'for A in st[E])
def A1(st):return st[F]
def A2(st):return st[C]and not st[F]
O=7
K,q,S,T=138,52,25,24
def U():
	while __poll and J.get_key(0)!=0:pass
	while D:
		A=J.get_key(0)
		if A!=0:
			while __poll and J.get_key(0)!=0:pass
			return A
def r():A.set_color(90,60,30);A.fill_rect(10,160,90,4);A.fill_rect(20,50,4,112);A.fill_rect(20,50,62,4);A.fill_rect(79,50,3,14)
def b(wrong):
	B=wrong;A.set_color(0,0,0)
	if B>=1:A.draw_circle(80,74,9)
	if B>=2:A.fill_rect(79,83,3,30)
	if B>=3:A.fill_rect(66,90,14,3)
	if B>=4:A.fill_rect(81,90,14,3)
	if B>=5:A.fill_rect(72,113,3,20)
	if B>=6:A.fill_rect(87,113,3,20)
def s(i):return K+i%O*S,q+i//O*T
def L(st,i,cur):
	B=chr(65+i);D,F=s(i);A.set_color(255,255,255);A.fill_rect(D,F,S-1,T-1);G=B in st[H]
	if G and B in st[E]:A.set_color(0,150,0)
	elif G:A.set_color(180,180,180)
	else:A.set_color(0,0,0)
	A.draw_text(D+7,F+23,B)
	if i==cur and not st[C]:A.set_color(0,0,210);A.draw_rect(D+1,F+1,S-3,T-3)
def t(st,cur):
	for A in V(26):L(st,A,cur)
def c(st):A.set_color(255,255,255);A.fill_rect(-1,8,321,22);A.set_color(0,0,0);A.draw_text(6,24,p(st))
def d(st):A.set_color(255,255,255);A.fill_rect(K,28,319-K+1,20);A.set_color(0,90,200);A.draw_text(K,44,a.get(st[E],'?'));A.set_color(0,0,0);A.draw_text(K+100,44,G(st[I])+'/'+G(st[X]))
def u(st,streak,best):
	A.set_color(255,255,255);A.fill_rect(-1,172,321,38)
	if st[F]:A.set_color(0,150,0);A.draw_text(6,188,'WIN! Streak '+G(streak))
	else:A.set_color(200,0,0);A.draw_text(6,188,'It was '+st[E])
	A.set_color(120,120,120);A.draw_text(6,206,'Best streak '+G(best))
def v(st,cur):A.clear();r();b(st[I]);c(st);d(st);t(st,cur)
def M(y,txt):A.draw_text((319-(Q(txt)*10-2))//2,y,txt)
def B(c):A.set_color(c[0],c[1],c[2])
def w(best):
	B((22,18,16));A.fill_rect(-1,-1,321,211);C,D=118,22;B((150,112,70));A.fill_rect(C,D,6,54);A.fill_rect(C,D,46,6);A.fill_rect(C-16,D+52,50,6);B((120,90,56));A.fill_rect(C+42,D,2,12);B((235,230,222));A.draw_circle(C+43,D+18,6);B((235,185,90));M(100,'HANGMAN');B((212,206,198));M(130,G(Q(R))+' words - 8 categories')
	if best:B((235,205,90));M(156,'BEST STREAK  '+G(best))
	B((130,120,110));M(190,'arrows + ENTER - press a key');return U()!=45
e='HIHNG'
def x():
	if not N:return 0
	try:return int(list(J.recall_list(e))[0])
	except f:return 0
def y(v):
	if N:
		try:J.store_list(e,[float(v)])
		except f:pass
def z(word,streak,best):
	E=streak;B=n(word);A=0;v(B,A)
	while not B[C]:
		D=U()
		if D==45:return h
		elif D in(24,26,25,34):
			G=A
			if D==24:A=(A-1)%26
			elif D==26:A=(A+1)%26
			elif D==25:A=(A-O)%26
			else:A=(A+O)%26
			L(B,G,A);L(B,A,A)
		elif D==105:
			o(B,chr(65+A));L(B,A,A);c(B);d(B);b(B[I])
			if B[C]:
				L(B,A,A)
				if B[F]:E+=1
				u(B,E,max(best,E))
	return Y if B[F]else g
def A0():
	E=x();C=0;B=[]
	while D:
		if not w(E):break
		I=D
		while I:
			if not B:
				B=list(V(Q(R)))
				for F in V(Q(B)-1,0,-1):G=i.randint(0,F);B[F],B[G]=B[G],B[F]
			H=z(R[B.pop()],C,E)
			if H==h:C=0;break
			C=C+1 if H==Y else 0
			if C>E:E=C;y(E)
			A.set_color(0,0,210);A.fill_rect(-1,92,321,34);A.set_color(255,255,255);M(114,'ENTER=again   CLEAR=quit')
			if U()==45:break
	A.clear()
if N:A0()