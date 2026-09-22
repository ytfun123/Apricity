# More games at ti84calcwiz.com
m='over'
l='best  '
k=Exception
Q=False
P=print
N=len
K=None
J=str
G=True
E=range
import random as R
try:import ti_draw as B,ti_system as L,time as X;M=G
except ImportError:
	import sys
	if sys.implementation.name=='tipython':P('This program needs ti_draw,');P('which your calculator is');P('missing. 2-minute fix:');P('calcplex.com/ti-draw-fix');raise SystemExit
	M=Q
A=8
n='EASY','NORMAL','HARD'
Y=5,6,7
def o(ncolors,rnd):
	B=[[0]*A for B in E(A)]
	for C in E(A):
		for D in E(A):
			while G:
				F=rnd.randint(1,ncolors)
				if D>=2 and B[C][D-1]==F and B[C][D-2]==F:continue
				if C>=2 and B[C-1][D]==F and B[C-2][D]==F:continue
				B[C][D]=F;break
	return B
def S(b):
	G=set()
	for C in E(A):
		B=1
		for D in E(1,A):
			if b[C][D]!=0 and b[C][D]==b[C][D-1]:B+=1
			else:
				if B>=3:
					for F in E(D-B,D):G.add((C,F))
				B=1
		if B>=3:
			for F in E(A-B,A):G.add((C,F))
	for D in E(A):
		B=1
		for C in E(1,A):
			if b[C][D]!=0 and b[C][D]==b[C-1][D]:B+=1
			else:
				if B>=3:
					for F in E(C-B,C):G.add((F,D))
				B=1
		if B>=3:
			for F in E(A-B,A):G.add((F,D))
	return G
def Z(b,ncolors,rnd):
	for B in E(A):
		C=[b[A][B]for A in E(A)if b[A][B]!=0];F=A-N(C);G=[rnd.randint(1,ncolors)for A in E(F)]+C
		for D in E(A):b[D][B]=G[D]
def T(b,a,c):b[a[0]][a[1]],b[c[0]][c[1]]=b[c[0]][c[1]],b[a[0]][a[1]]
def U(b,a,c):T(b,a,c);A=N(S(b))>0;T(b,a,c);return A
def a(b):
	for B in E(A):
		for C in E(A):
			if C+1<A and U(b,(B,C),(B,C+1)):return G
			if B+1<A and U(b,(B,C),(B+1,C)):return G
	return Q
def c(cleared,cascade):return cleared*10*cascade
def p(b,ncolors,rnd):
	B=0;C=1
	while G:
		A=S(b)
		if not A:return B
		for(D,E)in A:b[D][E]=0
		B+=c(N(A),C);Z(b,ncolors,rnd);C+=1
D=20
d=(319-A*D)//2
e=28
I=14,14,24
f=26,26,40
q=250,250,255
s=250,220,60
g={1:(232,66,66),2:(240,150,46),3:(238,216,62),4:(86,200,96),5:(74,142,240),6:(184,96,224),7:(78,222,214)}
h={1:(255,150,150),2:(255,200,130),3:(255,244,160),4:(170,240,180),5:(160,200,255),6:(225,175,250),7:(170,245,240)}
def C(col):A=col;B.set_color(A[0],A[1],A[2])
def F(y,txt):B.draw_text((319-(N(txt)*10-2))//2,y,txt)
def V(y,txt,col):C(I);B.fill_rect(-1,y-18,321,22);C(col);F(y,txt)
def O():
	while L.get_key(0)!=0:pass
	while G:
		A=L.get_key(0)
		if A!=0:
			while L.get_key(0)!=0:pass
			return A
def i(t):
	if not M:return
	A=X.monotonic()
	while X.monotonic()-A<t:pass
def H(b,r,c,cursor,selected):
	A,E=d+c*D,e+r*D;C(f);B.fill_rect(A,E,D,D);F=b[r][c]
	if F!=0:C(g[F]);B.fill_rect(A+2,E+2,D-4,D-4);C(h[F]);B.fill_rect(A+3,E+3,D-6,3);B.fill_rect(A+D//2-2,E+D//2-2,4,4)
	if selected==(r,c):C(s);B.fill_rect(A,E,D,3);B.fill_rect(A,E+D-3,D,3);B.fill_rect(A,E,3,D);B.fill_rect(A+D-3,E,3,D)
	elif cursor==(r,c):C(q);B.fill_rect(A,E,D,2);B.fill_rect(A,E+D-2,D,2);B.fill_rect(A,E,2,D);B.fill_rect(A+D-2,E,2,D)
def r(b,cursor,selected):
	for B in E(A):
		for C in E(A):H(b,B,C,cursor,selected)
def b(score,best,moves):C(I);B.fill_rect(-1,-1,321,25);C((240,232,120));B.draw_text(6,20,'SCORE '+J(score));C((150,205,235));B.draw_text(210,20,'BEST '+J(best))
def t(b,ncolors,cursor,selected,add_score):
	K=1
	while G:
		F=S(b)
		if not F:return
		C((250,250,255))
		for(I,J)in F:B.fill_rect(d+J*D+4,e+I*D+4,D-8,D-8)
		i(.12)
		for(I,J)in F:b[I][J]=0
		add_score(c(N(F),K));L=set(A for(B,A)in F);Z(b,ncolors,R)
		for J in L:
			for I in E(A):H(b,I,J,cursor,selected)
		i(.05);K+=1
j='GEMEA','GEMNO','GEMHA'
def W(mi):
	if not M:return 0
	try:return int(list(L.recall_list(j[mi]))[0])
	except k:return 0
def u(mi,v):
	if M:
		try:L.store_list(j[mi],[float(v)])
		except k:pass
def v():
	C(I);B.fill_rect(-1,-1,321,211);C((240,232,120));F(20,'HOW TO PLAY');C((214,220,235));D=['Move the cursor, ENTER to pick','up a gem, then press an arrow','to swap it with that neighbour.','Line up 3+ of one colour in a','row or column to clear them.','Gems above fall in and can','CHAIN for combo points.','A swap that makes no line is','undone (free). Game ends when','no swap can make a match.'];A=44
	for E in D:B.draw_text(6,A,E);A+=16
	C((120,130,160));F(206,'any key = back');O()
def w(mi):
	A=mi
	def K():
		C(I);B.fill_rect(-1,-1,321,211);L=[[1,2,3,4],[2,3,4,5],[3,4,5,6],[4,5,6,1]];A=24;M=(319-4*A)//2
		for H in E(4):
			for J in E(4):D,G=M+J*A,30+H*A;C(f);B.fill_rect(D,G,A,A);K=L[H][J];C(g[K]);B.fill_rect(D+2,G+2,A-4,A-4);C(h[K]);B.fill_rect(D+3,G+3,A-6,3)
		C((240,232,120));F(150,'G E M S');C((150,165,200));F(172,'<- -> mode    up/dn help')
	def H(m):
		A=W(m);V(194,'< '+n[m]+'  '+J(Y[m])+' colors >',(215,235,245))
		if A:V(208,l+J(A),(150,235,170))
		else:V(208,'ENTER play   CLEAR quit',(120,130,160))
	K();H(A)
	while G:
		D=O()
		if D==45:return
		if D==24:A=(A-1)%3;H(A)
		elif D==26:A=(A+1)%3;H(A)
		elif D in(25,34):v();K();H(A)
		elif D==105:return A
def x(mi):
	Q=Y[mi]
	while G:
		F=o(Q,R);p(F,Q,R)
		if a(F):break
	X=W(mi);L=[0];D=A//2,A//2;E=K;B.clear();C(I);B.fill_rect(-1,-1,321,211);b(L[0],X,0);r(F,D,E)
	def e(pts):L[0]+=pts;b(L[0],X,0)
	while G:
		N=O()
		if N==45:return'quit',L[0]
		J={25:(-1,0),34:(1,0),24:(0,-1),26:(0,1)}.get(N)
		if E is K:
			if J:f=(D[0]+J[0])%A;g=(D[1]+J[1])%A;Z=D;D=f,g;H(F,Z[0],Z[1],D,E);H(F,D[0],D[1],D,E)
			elif N==105:E=D;H(F,D[0],D[1],D,E)
		elif N==105:S,V=E;E=K;H(F,S,V,D,E)
		elif J:
			c=E[0]+J[0];d=E[1]+J[1]
			if 0<=c<A and 0<=d<A:
				P=E;M=c,d
				if U(F,P,M):
					T(F,P,M);E=K;D=M;H(F,P[0],P[1],D,E);H(F,M[0],M[1],D,E);t(F,Q,D,E,e);H(F,D[0],D[1],D,E)
					if not a(F):return m,L[0]
				else:S,V=E;E=K;H(F,S,V,D,E)
def y():
	A=1
	while G:
		L=w(A)
		if L is K:break
		A=L;E=G
		while E:
			N,D=x(A);H=W(A)
			if D>H:u(A,D);H=D
			C(I);B.fill_rect(-1,-1,321,211);C((240,232,120));F(70,'NO MORE MOVES'if N==m else'GAME OVER');C((235,240,250));F(100,'score  '+J(D));C((150,235,170));F(124,l+J(H));C((150,165,200));F(158,'ENTER play again');F(182,'<- -> menu   CLEAR quit');M=O()
			if M==45:E=Q
			elif M in(24,26):E=Q
	B.clear()
if M:y()