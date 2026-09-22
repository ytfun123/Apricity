# More games at ti84calcwiz.com
A0=Exception
n='scored'
m=max
e='quit'
d='dead'
c='vy'
b=str
a=len
Z=print
V='alive'
U='gap'
T=int
N='by'
M='x'
L=False
J=True
H='score'
F='pipes'
import random as o
try:import ti_draw as A,ti_system as Q,time as p;W=J
except ImportError:
	import sys
	if sys.implementation.name=='tipython':Z('This program needs ti_draw,');Z('which your calculator is');Z('missing. 2-minute fix:');Z('calcplex.com/ti-draw-fix');raise SystemExit
	W=L
C,q=319,209
E=196
D=20
I,G=56,12
A1=.55
A2=-5.5
f=4
O=28
R=56
A3=215
r=26
def A4():return D+r,E-R-r
def s(x,randint):A,B=A4();return{M:x,U:randint(A,B),n:L}
def A5(randint):return{N:q/2.-G/2.,c:.0,F:[s(C,randint)],H:0,V:J}
def A6(st,p):
	if p[M]+O<=I or I+G<=p[M]:return L
	A=p[U];B=p[U]+R;return st[N]<A or st[N]+G>B
def A7(st,flap,randint,scale=1.):
	K=scale;A=st
	if not A[V]:return d
	if flap:A[c]=A2
	A[c]+=A1*K;A[N]+=A[c]*K
	for B in A[F]:B[M]-=f*K
	A[F]=[A for A in A[F]if A[M]+O>0];Q=m((A[M]for A in A[F]),default=-9999)
	if Q<=C-A3:A[F].append(s(C,randint))
	if A[N]<D or A[N]+G>=E:A[V]=L;return d
	for B in A[F]:
		if A6(A,B):A[V]=L;return d
	P=L
	for B in A[F]:
		if not B[n]and B[M]+O<I:B[n]=J;A[H]+=1;P=J
	if P:return H
	return'flap'if flap else'ok'
def t():
	while Q.get_key(0)!=0:pass
	while J:
		A=Q.get_key(0)
		if A!=0:
			while Q.get_key(0)!=0:pass
			return A
S=110,185,232
g=222,200,120
h=130,200,90
u=96,186,84
AJ=70,150,66
AK=150,214,120
AL=52,116,50
i=245,205,60
A8=24,44,70
def A9():A.set_color(S[0],S[1],S[2]);A.fill_rect(-1,-1,C+2,E+1);A.set_color(70,150,200);A.fill_rect(-1,D-2,C+2,3);A.set_color(g[0],g[1],g[2]);A.fill_rect(-1,E,C+2,q-E+1);A.set_color(h[0],h[1],h[2]);A.fill_rect(-1,E,C+2,4)
P=G+3
def j():return Q.get_key(0)
def AA(p):
	G=T(p[M]);H=p.get('px',G)
	if H<=G:return
	B=m(0,G+O-1);J=min(C,H+O+2);F=J-B
	if F<2:return
	if B<I+P and J>I:K=p[U];L=K+R;A.fill_rect(B,D,F,K-D);A.fill_rect(B,L,F,E-L)
	else:A.fill_rect(B,D,F,E-D)
def v(p):
	B=T(p[M]);p['px']=B;F=m(0,B);G=min(C,B+O)-F
	if G>=2:H=p[U]+R;A.fill_rect(F,D,G,p[U]-D);A.fill_rect(F,H,G,E-H)
def X(y):
	if y<D:return D
	if y>E-G:return E-G
	return y
def AB(y):B(i);A.fill_rect(I,X(y),P,G)
def K(y,txt):A.draw_text((319-(a(txt)*10-2))//2,y,txt)
Y=[('NORMAL',4,56,'HIFLP'),('FAST',5,50,'HIFLF'),('INSANE',6,44,'HIFLI')]
def w(name):
	if not W:return 0
	try:return T(list(Q.recall_list(name))[0])
	except A0:return 0
def AC(name,v):
	if W:
		try:Q.store_list(name,[float(v)])
		except A0:pass
def B(c):A.set_color(c[0],c[1],c[2])
def k(x,y,w,h,c):B(c);A.fill_rect(x,y,w,h);B((c[0]+(255-c[0])*45//100,c[1]+(255-c[1])*45//100,c[2]+(255-c[2])*45//100));A.fill_rect(x,y,w,2);A.fill_rect(x,y,2,h);B((c[0]*55//100,c[1]*55//100,c[2]*55//100));A.fill_rect(x,y+h-2,w,2);A.fill_rect(x+w-2,y,2,h)
def AD():B((110,185,232));A.fill_rect(-1,-1,321,211);B((222,200,120));A.fill_rect(-1,196,321,14);B((130,200,90));A.fill_rect(-1,192,321,5);k(262,-1,42,67,(96,186,84));k(256,66,54,12,(96,186,84));k(44,86,24,18,(245,205,60));B((250,245,250));A.fill_rect(48,92,8,6);B((30,30,30));A.fill_rect(58,90,4,4);B((250,150,40));A.fill_rect(66,94,8,5);B((24,44,70));K(50,'FLAPPY BIRD');B((24,44,70));K(172,'<- ->  pick difficulty');B((30,50,78));K(192,'ENTER play    CLEAR quit')
def l(sel):C,E,F,D=Y[sel];B((110,185,232));A.fill_rect(78,104,164,52);B((255,235,120));K(124,'< '+C+' >');B((255,255,255));K(150,'BEST  '+b(w(D)))
def AE(sel):
	A=sel;AD();l(A)
	while J:
		B=t()
		if B==45:return-1
		if B==105:return A
		if B==24:A=(A-1)%a(Y);l(A)
		elif B==26:A=(A+1)%a(Y);l(A)
AF=.05
x,y=(C-40)//2,40
def z(score):C=b(score);B(S);A.fill_rect(x,2,y,D-4);B(A8);A.draw_text(x+(y-(a(C)*10-2))//2,22,C)
def AG():
	C=A5(o.randint);A9();B(u)
	for M in C[F]:v(M)
	U=X(T(C[N]));AB(U);z(C[H]);Z=C[H];Q=L;a=p.monotonic()
	while C[V]:
		b=p.monotonic();R=(b-a)/AF;a=b
		if R>2.:R=2.
		elif R<.4:R=.4
		f=C[F];g=A7(C,Q,o.randint,R);Q=L
		if g==d:B(S);A.fill_rect(I,U,P,G+1);B(i);A.fill_rect(I,X(T(C[N])),P,G);break
		K=j()
		if K==45:return e,C[H]
		if K in(25,105):Q=J
		W=X(T(C[N]));c=U;h=[id(A)for A in C[F]];B(i);A.fill_rect(I,W,P,G);B(S);Y=W-c
		if Y>0:A.fill_rect(I,c,P,Y+1)
		elif Y<0:A.fill_rect(I,W+G,P,-Y+1)
		for M in C[F]:AA(M)
		for M in f:
			if id(M)not in h:A.fill_rect(-1,D,O+3+1,E-D);break
		K=j()
		if K==45:return e,C[H]
		if K in(25,105):Q=J
		B(u)
		for M in C[F]:v(M)
		U=W
		if C[H]!=Z:z(C[H]);Z=C[H]
		K=j()
		if K==45:return e,C[H]
		if K in(25,105):Q=J
	return'over',C[H]
def AH(score,hi):G,H=130,146;I=(C-G)//2;F=D+(E-D-H)//2;B((255,230,120));A.fill_rect(I,F,G,H);B((26,36,58));A.fill_rect(I+3,F+3,G-6,H-6);B((255,95,70));K(F+32,'GAME OVER');B((235,240,250));K(F+62,'Score  '+b(score));B((255,220,120));K(F+84,'Best   '+b(hi));B((150,172,205));K(F+112,'ENTER again');K(F+132,'CLEAR menu');return t()!=45
def AI():
	global f,R;B=0
	while J:
		B=AE(B)
		if B<0:break
		H,f,R,F=Y[B];D=J
		while D:
			G,E=AG()
			if G==e:D=L
			else:
				C=w(F)
				if E>C:C=E;AC(F,C)
				D=AH(E,C)
	A.clear()
if W:AI()