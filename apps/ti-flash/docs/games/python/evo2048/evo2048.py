# More games at ti84calcwiz.com
j='2048'
i=Exception
Z='D'
Y='L'
X=list
T='U'
S='R'
R=False
Q=print
I=str
H=len
F=range
E=True
import random as K
try:import ti_draw as A,ti_system as J;L=E
except ImportError:
	import sys
	if sys.implementation.name=='tipython':Q('This program needs ti_draw,');Q('which your calculator is');Q('missing. 2-minute fix:');Q('calcplex.com/ti-draw-fix');raise SystemExit
	L=R
__poll=1
try:J.get_key
except AttributeError:
	def __key(w=0):return J.wait_key()
	J.get_key=__key
	__poll=0
C=4
def k(row):
	B=[A for A in row if A];D,E,A=[],0,0
	while A<H(B):
		if A+1<H(B)and B[A]==B[A+1]:D.append(B[A]*2);E+=B[A]*2;A+=2
		else:D.append(B[A]);A+=1
	D+=[0]*(C-H(D));return D,E
def M(g):return[X(A)for A in zip(*g)]
def N(g):return[X(reversed(A))for A in g]
def a(grid,d):
	B=grid
	if d==Y:C=B
	elif d==S:C=N(B)
	elif d==T:C=M(B)
	else:C=N(M(B))
	A,D=[],0
	for E in C:F,G=k(E);A.append(F);D+=G
	if d==S:A=N(A)
	elif d==T:A=M(A)
	elif d==Z:A=M(N(A))
	H=A!=B;return A,D,H
def b(grid):return[(A,B)for A in F(C)for B in F(C)if grid[A][B]==0]
def l(grid):
	if b(grid):return E
	for A in(Y,S,T,Z):
		B,B,C=a(grid,A)
		if C:return E
	return R
def U(grid,randint,rnd01):
	A=b(grid)
	if not A:return
	B,C=A[randint(0,H(A)-1)];grid[B][C]=4 if rnd01()<.1 else 2
def m(randint,rnd01):D=rnd01;B=randint;A=[[0]*C for A in F(C)];U(A,B,D);U(A,B,D);return A
d,V=3,30
O,W,G=72,37,5
n={0:(214,205,196),2:(238,228,218),4:(237,224,200),8:(242,177,121),16:(245,149,99),32:(246,124,95),64:(246,94,59),128:(237,207,114),256:(237,204,97),512:(237,200,80),1024:(237,197,63),2048:(237,194,46)}
def P():
	while __poll and J.get_key(0)!=0:pass
	while E:
		A=J.get_key(0)
		if A!=0:
			while __poll and J.get_key(0)!=0:pass
			return A
def c(score,best):A.set_color(255,255,255);A.fill_rect(-1,-1,321,V-2+1);A.set_color(0,0,0);A.draw_text(6,22,'SCORE '+I(score));A.draw_text(180,22,'BEST '+I(best))
def e(grid,r,c):
	B=grid[r][c];C=n.get(B,(60,58,50));D=d+G+c*(O+G);E=V+G+r*(W+G);A.set_color(C[0],C[1],C[2]);A.fill_rect(D,E,O,W)
	if B:
		F=I(B)
		if B<=4:A.set_color(0,0,0)
		else:A.set_color(255,255,255)
		J=D+(O-(H(F)*10-2))//2;A.draw_text(J,E+26,F)
def f(grid,score,best):
	A.clear();A.set_color(160,150,138);A.fill_rect(d,V,C*O+(C+1)*G,C*W+(C+1)*G)
	for B in F(C):
		for D in F(C):e(grid,B,D)
	c(score,best)
def D(y,txt):A.draw_text((319-(H(txt)*10-2))//2,y,txt)
g='H2048'
def o():
	if not L:return 0
	try:return int(X(J.recall_list(g))[0])
	except i:return 0
def p(v):
	if L:
		try:J.store_list(g,[float(v)])
		except i:pass
def B(c):A.set_color(c[0],c[1],c[2])
def q(x,y,w,h,c):B(c);A.fill_rect(x,y,w,h);B((c[0]+(255-c[0])*45//100,c[1]+(255-c[1])*45//100,c[2]+(255-c[2])*45//100));A.fill_rect(x,y,w,2);A.fill_rect(x,y,2,h);B((c[0]*55//100,c[1]*55//100,c[2]*55//100));A.fill_rect(x,y+h-2,w,2);A.fill_rect(x+w-2,y,2,h)
def r(best):
	B((28,24,20));A.fill_rect(-1,-1,321,211);E=[('2',(238,228,218),(90,80,70)),('4',(237,224,200),(90,80,70)),('8',(242,177,121),(255,255,255))];F=110
	for(G,(H,J,K))in enumerate(E):C=F+G*34;q(C,28,30,30,J);B(K);A.draw_text(C+11,55,H)
	B((237,194,46));D(86,j)
	if best:B((230,200,110));D(114,'BEST  '+I(best))
	B((225,220,210));D(150,'Arrows to slide tiles');B((150,140,120));D(186,'press a key to start');return P()!=45
def h(msg,col):B=col;A.set_color(28,24,20);A.fill_rect(30,100,259,34);A.set_color(B[0],B[1],B[2]);D(122,msg);P()
def s(best):
	D=best;A=m(K.randint,K.random);B=0;f(A,B,D);I=R
	while E:
		J=P()
		if J==45:return B,D,E
		L={25:T,34:Z,24:Y,26:S}.get(J)
		if not L:continue
		N,M,O=a(A,L)
		if not O:continue
		Q=A;A=N;B+=M
		if B>D:D=B
		U(A,K.randint,K.random)
		for G in F(C):
			for H in F(C):
				if A[G][H]!=Q[G][H]:e(A,G,H)
		if M:c(B,D)
		if not I and any(2048 in A for A in A):I=E;h('YOU MADE 2048!',(90,220,120));f(A,B,D)
		if not l(A):h('GAME OVER',(235,90,90));return B,D,R
def t():
	C=o()
	while E:
		if not r(C):break
		F=E
		while F:
			G,C,H=s(C);p(C)
			if H:break
			B((28,24,20));A.fill_rect(-1,-1,321,211);B((237,194,46));D(64,j);B((225,220,210));D(104,'Score  '+I(G));B((230,200,110));D(130,'Best   '+I(C));B((150,140,120));D(176,'ENTER = again    CLEAR = quit')
			if P()==45:break
	A.clear()
if L:t()