# More games at ti84calcwiz.com
e='snake'
d=Exception
c='head'
b='dead'
a='eaten'
Z='gold'
Y='dy'
X='dx'
W=str
V=len
U=print
P=None
O='alive'
N='score'
K='tail'
H='food'
G=False
F=True
import random as f
try:import ti_draw as A,ti_system as Q,time as g;R=F
except ImportError:
	import sys
	if sys.implementation.name=='tipython':U('This program needs ti_draw,');U('which your calculator is');U('missing. 2-minute fix:');U('calcplex.com/ti-draw-fix');raise SystemExit
	R=G
__poll=1
try:Q.get_key
except AttributeError:
	def __key(w=0):return Q.wait_key()
	Q.get_key=__key
	__poll=0
D=10
L=30
I=31
E=17
S=0
T=L
n=.16
J=[('SLOW',.15,'HISNS'),('NORMAL',.11,'HISNK'),('FAST',.07,'HISNF')]
def o(code,dx,dy):
	A=code
	if A==25 and dy==0:return 0,-1
	if A==34 and dy==0:return 0,1
	if A==24 and dx==0:return-1,0
	if A==26 and dx==0:return 1,0
	if A==45:return'Q'
def h(snake,randint):
	A=randint
	while F:
		B=A(0,I-1),A(0,E-1)
		if B not in snake:return B
def p(randint):A=[(3,E//2),(2,E//2),(1,E//2)];return{e:A,X:1,Y:0,H:h(A,randint),Z:G,a:0,N:0,O:F}
def q(eaten,mode_idx=1):
	A=mode_idx
	if 0<=A<V(J):return J[A][1]
	return n
def r(state,randint):
	A=state;D=A[e];J,L=D[0];B,C=J+A[X],L+A[Y]
	if B<0 or B>=I or C<0 or C>=E or(B,C)in D:A[O]=G;return{b:F}
	D.insert(0,(B,C))
	if(B,C)==A[H]:A[a]+=1;A[N]+=3 if A[Z]else 1;A[Z]=(A[a]+1)%5==0;A[H]=h(D,randint);return{b:G,c:(B,C),K:P}
	M=D.pop();return{b:G,c:(B,C),K:M}
def M(gx,gy,r,g,b):A.set_color(r,g,b);A.fill_rect(S+gx*D,T+gy*D,D,D)
def i(score):A.set_color(20,32,25);A.fill_rect(-1,-1,321,L-1+1);A.set_color(205,222,208);A.draw_text(6,24,'SCORE '+W(score))
def j():
	while F:
		A=Q.get_key(0)
		if A!=0:return A
def k(state):
	A=state
	if A[Z]:M(A[H][0],A[H][1],255,190,0)
	else:M(A[H][0],A[H][1],235,70,70)
def s(state):
	B=state;A.clear();A.set_color(12,22,16);A.fill_rect(-1,-1,321,211);A.set_color(40,70,55);A.draw_rect(S,T,I*D,E*D)
	for(C,F)in B[e]:M(C,F,60,210,120)
	k(B);i(B[N])
def t(mode_idx):
	A=p(f.randint);s(A);E=G
	while A[O]:
		H=g.monotonic();C=P
		while g.monotonic()-H<q(A[a],mode_idx):
			D=o(Q.get_key(0),A[X],A[Y])
			if D=='Q':E=F;A[O]=G;break
			if D is not P:C=D
		if not A[O]:break
		if C:A[X],A[Y]=C
		B=r(A,f.randint)
		if B[b]:break
		if B[K]is not P:M(B[K][0],B[K][1],12,22,16)
		M(B[c][0],B[c][1],60,210,120);k(A)
		if B[K]is P:i(A[N])
	return not E,A[N]
def C(y,txt):A.draw_text((319-(V(txt)*10-2))//2,y,txt)
def l(name):
	if not R:return 0
	try:return int(list(Q.recall_list(name))[0])
	except d:return 0
def u(name,v):
	if R:
		try:Q.store_list(name,[float(v)])
		except d:pass
def B(c):A.set_color(c[0],c[1],c[2])
def m(x,y,w,h,c):B(c);A.fill_rect(x,y,w,h);B((c[0]+(255-c[0])*45//100,c[1]+(255-c[1])*45//100,c[2]+(255-c[2])*45//100));A.fill_rect(x,y,w,2);A.fill_rect(x,y,2,h);B((c[0]*55//100,c[1]*55//100,c[2]*55//100));A.fill_rect(x,y+h-2,w,2);A.fill_rect(x+w-2,y,2,h)
def v():
	B((12,22,16));A.fill_rect(-1,-1,321,211);D=92
	for E in range(6):m(D+E*16,36,14,14,(40,165-E*14,80))
	m(D+96+10,36,14,14,(210,60,60));B((90,220,120));C(82,'SNAKE');B((205,222,208));C(154,'Arrows to move  |  GOLD = 3 pts');B((120,155,130));C(174,'<- -> pick difficulty');C(194,'ENTER play    CLEAR quit')
def w(sel):
	B((12,22,16));A.fill_rect(-1,94,321,40);E,G,F=J[sel];D=l(F);B((255,235,120));C(114,'< '+E+' >')
	if D>0:B((255,255,255));C(132,'BEST  '+W(D))
def x(sel):
	A=sel;v()
	while F:
		w(A);B=j()
		if B==45:return-1
		if B==105:return A
		if B==24:A=(A-1)%V(J)
		elif B==26:A=(A+1)%V(J)
def y(score,hi):B((12,22,16));A.fill_rect(-1,-1,321,211);B((235,90,90));C(62,'GAME OVER');B((205,222,208));C(100,'Score  '+W(score));B((235,205,90));C(126,'Best   '+W(hi));B((120,155,130));C(168,'ENTER = play again');C(192,'CLEAR = quit');D=j();return D!=45
def z():
	global I,E,S,T
	try:H,K=A.get_screen_dim();I=H//D;E=(K-L)//D;S=(H-I*D)//2;T=L+(K-L-E*D)//2
	except d:pass
	B=1
	while F:
		B=x(B)
		if B<0:break
		P,Q,M=J[B];C=l(M);N=F
		while N:
			O,G=t(B)
			if not O:break
			if G>C:C=G;u(M,C)
			N=y(G,C)
	A.clear()
if R:z()