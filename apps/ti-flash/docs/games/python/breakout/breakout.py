# More games at ti84calcwiz.com
AI='XX.X.XX'
AH='X..X..X'
AG='XXX.XXX'
AF='XX...XX'
AE='X.....X'
AD='..XXX..'
AC='.X.X.X.'
AB=Exception
z='brick'
y='.XXXXX.'
x='X.X.X.X'
t='won'
s='alive'
r=print
k='quit'
j='spd'
i=float
b='type'
Z='lives'
Y='bricks'
X=False
V='vx'
U=True
T=str
N='XXXXXXX'
Q='score'
L='vy'
I=range
K='level'
J='px'
H='by'
F='bx'
E=int
import random,math
try:import ti_draw as B,ti_system as O,time as c;l=U
except ImportError:
	import sys
	if sys.implementation.name=='tipython':r('This program needs ti_draw,');r('which your calculator is');r('missing. 2-minute fix:');r('calcplex.com/ti-draw-fix');raise SystemExit
	l=X
__poll=1
try:O.get_key
except AttributeError:
	def __key(w=0):return O.wait_key()
	O.get_key=__key
	__poll=0
C,d,W=319,209,24
e,S=7,5
u,f,A0,a=45,14,2,30
G=6
R,g,P=52,6,196
AJ=6.
AW=.03
A1=[[N,N,N,N,N],[x,AC,x,AC,x],[AD,y,N,y,AD],[N,AE,'X.XXX.X',AE,N],[AF,AG,y,AG,AF],[AH,AI,N,AI,AH]]
def A2(level=1):A=A1[(level-1)%len(A1)];return[[A[B][C]=='X'for C in I(e)]for B in I(S)]
def A3(level):A=.85+.08*(level-1);return A if A<1.3 else 1.3
def AK():A=A3(1);return{F:(C-G)/2.,H:P-4e1,V:2.*A,L:-3.*A,J:(C-R)/2.,Y:A2(),Q:0,Z:3,K:1,j:A,s:U,t:X}
def AL(st):return sum(1 for A in I(S)for B in I(e)if st[Y][A][B])
def A4(st):A=st;A[F]=(C-G)/2.;A[H]=P-4e1;A[V]=2.*A[j];A[L]=-3.*A[j]
def AM(st):A=st;A[K]+=1;A[j]=A3(A[K]);A[Y]=A2(A[K]);A[Z]+=1;A[t]=X;A4(A)
def AN(st,scale=1.):
	I=scale;A=st;A[F]+=A[V]*I;A[H]+=A[L]*I
	if A[F]<=0:A[F]=.0;A[V]=-A[V]
	elif A[F]>=C-G:A[F]=i(C-G);A[V]=-A[V]
	if A[H]<=W:A[H]=i(W);A[L]=-A[L]
	if A[L]>0:
		c=A[H]-A[L]*I
		if c+G<=P+1.5:
			if P<=A[H]+G<=P+g+6:
				if A[J]<=A[F]+G and A[F]<=A[J]+R:A[H]=i(P-G);h=A[J]+R/2.;k=(A[F]+G/2.-h)/(R/2.);N=math.sqrt(13.)*A[j];K=k*4.;M=-3.;O=math.sqrt(K*K+M*M);A[V]=K/O*N;A[L]=M/O*N
	if A[H]>=d:
		A[Z]-=1
		if A[Z]<=0:A[s]=X
		return{b:'dead'}
	l=A[F]+G/2.;T=A[H]+G/2.
	if a<=T<a+S*f:
		D=E((l-A0)//u);B=E((T-a)//f)
		if 0<=B<S and 0<=D<e and A[Y][B][D]:
			A[Y][B][D]=X;A[Q]+=S-B;A[L]=-A[L]
			if AL(A)==0:A[t]=U
			return{b:z,'row':B,'col':D}
	return{b:'ok'}
h=None
def D(r,g,b):
	global h;A=r,g,b
	if h!=A:B.set_color(r,g,b);h=A
def A5():global h;B.clear();h=None
AO=[(225,80,80),(235,160,70),(235,215,80),(96,186,84),(70,150,200)]
def A6():
	while __poll and O.get_key(0)!=0:pass
	while U:
		A=O.get_key(0)
		if A!=0:
			while __poll and O.get_key(0)!=0:pass
			return A
def v(r,c):return A0+c*u,a+r*f,u-2,f-2
def A7(st,r,c):
	if not st[Y][r][c]:return
	C,E,F,G=v(r,c);A=AO[r];D(A[0],A[1],A[2]);B.fill_rect(C,E,F,G)
def AP(st,x,y,w,h):
	if y+h<=a or y>=a+S*f:return
	for A in I(S):
		for B in I(e):
			if not st[Y][A][B]:continue
			C,D,E,F=v(A,B)
			if x<C+E and C<x+w and y<D+F and D<y+h:A7(st,A,B)
def m(x,y,is_erase=X):
	if y>=d:return
	A=G
	if y+A>d:A=d-y
	if A>=2:
		if is_erase:D(14,14,24)
		else:D(240,240,240)
		B.fill_rect(E(x),E(y),G,A)
n=-1
o=-1
p=-1
def w(st,force=X):
	A=st;global n,o,p
	if force:D(14,14,24);B.fill_rect(-1,-1,C+2,W-2+1);D(30,30,45);B.fill_rect(-1,W-2,C+2,2);n=-1;o=-1;p=-1
	if A[Q]!=n:D(14,14,24);B.fill_rect(6,2,130,W-4);D(205,210,225);B.draw_text(6,20,'SCORE '+T(A[Q]));n=A[Q]
	if A[K]!=o:D(14,14,24);B.fill_rect(150,2,70,W-4);D(205,210,225);B.draw_text(150,20,'LV '+T(A[K]));o=A[K]
	if A[Z]!=p:D(14,14,24);B.fill_rect(230,2,85,W-4);D(205,210,225);B.draw_text(230,20,'LIVES '+T(A[Z]));p=A[Z]
def A8(st):
	A=st;A5();D(14,14,24);B.fill_rect(-1,-1,C+2,d+2)
	for G in I(S):
		for K in I(e):A7(A,G,K)
	w(A,force=U);D(90,160,235);B.fill_rect(E(A[J]),P,R,g);m(A[F],A[H])
def q(c,pdir):
	if c==24:return-1
	elif c==26:return 1
	elif c in(25,34):return 0
	return pdir
def AQ():
	A=AK();A8(A);S,V=E(A[F]),E(A[H]);X=E(A[J]);L=0;f=c.monotonic();o=.03;p=.04
	while A[s]:
		e=c.monotonic();W=(e-f)/o;f=e
		if W>2.5:W=2.5
		elif W<.4:W=.4
		N=O.get_key(0)
		if N==45:return k,A[Q],A[K]
		L=q(N,L)
		if L:
			A[J]+=L*AJ*W
			if A[J]<0:A[J]=.0;L=0
			elif A[J]>C-R:A[J]=i(C-R);L=0
		Y=AN(A,W);m(S,V,is_erase=U);AP(A,S,V,G,G)
		if Y[b]==z:r,u,I,x=v(Y['row'],Y['col']);D(14,14,24);B.fill_rect(r,u,I,x)
		N=O.get_key(0)
		if N==45:return k,A[Q],A[K]
		L=q(N,L);Z=E(A[J])
		if Z!=X:
			D(90,160,235);B.fill_rect(Z,P,R,g);D(14,14,24);h=Z-X;j=abs(h)
			if h>0:
				I=j+1;a=X
				if a+I>C:I=C-a
				if I<2:
					I=2
					if a+I>C:a=C-2
				B.fill_rect(a,P,I,g)
			else:
				I=j+1;d=Z+R
				if d+I>C:I=C-d
				if I<2:
					I=2
					if d+I>C:d=C-2
				B.fill_rect(d,P,I,g)
			X=Z
		if Y[b]=='dead':
			w(A)
			if A[s]:A4(A);S,V=E(A[F]),E(A[H]);m(S,V)
			continue
		l,n=E(A[F]),E(A[H]);m(l,n);S,V=l,n
		if Y[b]==z:
			w(A)
			if A[t]:
				D(90,160,235);M(110,'LEVEL '+T(A[K])+' CLEAR!');y=c.monotonic()
				while __poll and c.monotonic()-y<1.2:O.get_key(0)
				AM(A);A8(A);S,V=E(A[F]),E(A[H]);X=E(A[J])
		N=O.get_key(0)
		if N==45:return k,A[Q],A[K]
		L=q(N,L)
		while c.monotonic()-e<p:
			N=O.get_key(0)
			if N==45:return k,A[Q],A[K]
			L=q(N,L)
	return'over',A[Q],A[K]
def M(y,txt):B.draw_text((319-(len(txt)*10-2))//2,y,txt)
A9='HIBRK'
def AR():
	if not l:return 0
	try:return E(list(O.recall_list(A9))[0])
	except AB:return 0
def AS(v):
	if l:
		try:O.store_list(A9,[i(v)])
		except AB:pass
def A(c):D(c[0],c[1],c[2])
def AA(x,y,w,h,c):A(c);B.fill_rect(x,y,w,h);A((c[0]+(255-c[0])*45//100,c[1]+(255-c[1])*45//100,c[2]+(255-c[2])*45//100));B.fill_rect(x,y,w,2);B.fill_rect(x,y,2,h);A((c[0]*55//100,c[1]*55//100,c[2]*55//100));B.fill_rect(x,y+h-2,w,2);B.fill_rect(x+w-2,y,2,h)
def AT(hi):
	A((14,14,24));B.fill_rect(-1,-1,321,211);D,C=7,36;F=(319-(D*(C+2)-2))//2;G=[(225,80,80),(235,160,70),(235,215,80)]
	for E in I(3):
		for H in I(D):AA(F+H*(C+2),24+E*14,C,12,G[E])
	A((240,240,240));B.fill_rect(156,70,7,7);AA(129,86,60,9,(90,160,235));A((90,170,240));M(122,'BREAKOUT')
	if hi:A((235,205,90));M(148,'BEST  '+T(hi))
	A((205,210,225));M(174,'<- -> glide    v park');A((120,124,140));M(196,'press a key to start');return A6()!=45
def AU(score,level,hi):A((14,14,24));B.fill_rect(-1,-1,321,211);A((235,90,90));M(56,'GAME OVER');A((205,210,225));M(94,'Score  '+T(score));M(118,'Level  '+T(level));A((235,205,90));M(142,'Best   '+T(hi));A((120,124,140));M(174,'ENTER = play again');M(196,'CLEAR = quit');return A6()!=45
def AV():
	A=AR()
	while U:
		if not AT(A):break
		C=U
		while C:
			D,B,E=AQ()
			if D==k:break
			if B>A:A=B;AS(A)
			if not AU(B,E,A):break
	A5()
if l:AV()