# More games at ti84calcwiz.com
i='quit'
h=Exception
d='first'
c='mines'
b=len
Y=print
U=str
P=None
O='count'
N='flag'
L='won'
K='alive'
J=False
I='revealed'
H='mine'
G='cols'
F='rows'
D=True
B=range
import random as j
try:import ti_draw as A,ti_system as Q,time as e;V=D
except ImportError:
	import sys
	if sys.implementation.name=='tipython':Y('This program needs ti_draw,');Y('which your calculator is');Y('missing. 2-minute fix:');Y('calcplex.com/ti-draw-fix');raise SystemExit
	V=J
__poll=1
try:Q.get_key
except AttributeError:
	def __key(w=0):return Q.wait_key()
	Q.get_key=__key
	__poll=0
R,S,k=9,15,25
W=[('EASY',15),('NORMAL',25),('HARD',40)]
def l(mines=k):return{F:R,G:S,c:mines,H:[[J]*S for A in B(R)],O:[[0]*S for A in B(R)],I:[[J]*S for A in B(R)],N:[[J]*S for A in B(R)],K:D,L:J,d:D}
def Z(st,r,c):
	A=[]
	for B in(-1,0,1):
		for C in(-1,0,1):
			if B==0 and C==0:continue
			D,E=r+B,c+C
			if 0<=D<st[F]and 0<=E<st[G]:A.append((D,E))
	return A
def m(st,sr,sc,randint):
	I=randint;A=st;L=set([(sr,sc)]+Z(A,sr,sc));J=0;K=0
	while J<A[c]and K<100000:
		K+=1;C=I(0,A[F]-1);E=I(0,A[G]-1)
		if(C,E)in L or A[H][C][E]:continue
		A[H][C][E]=D;J+=1
	for C in B(A[F]):
		for E in B(A[G]):A[O][C][E]=sum(1 for(B,C)in Z(A,C,E)if A[H][B][C])
def n(st,r,c,randint):
	A=st
	if not A[K]or A[L]:return'dead'
	if A[N][r][c]or A[I][r][c]:return'noop'
	if A[d]:m(A,r,c,randint);A[d]=J
	if A[H][r][c]:A[I][r][c]=D;A[K]=J;return H
	E=[(r,c)]
	while E:
		B,C=E.pop()
		if A[I][B][C]or A[H][B][C]or A[N][B][C]:continue
		A[I][B][C]=D
		if A[O][B][C]==0:
			for(F,G)in Z(A,B,C):
				if not A[I][F][G]:E.append((F,G))
	if p(A):A[L]=D;return'win'
	return'ok'
def o(st,r,c):
	A=st
	if A[K]and not A[L]and not A[I][r][c]:A[N][r][c]=not A[N][r][c]
def p(st):
	for A in B(st[F]):
		for C in B(st[G]):
			if not st[H][A][C]and not st[I][A][C]:return J
	return D
def q(st):return sum(1 for A in B(st[F])for C in B(st[G])if st[N][A][C])
C=20
s,f=4,28
t={1:(0,0,220),2:(0,140,0),3:(220,0,0),4:(0,0,120),5:(140,0,0),6:(0,150,150),7:(0,0,0),8:(110,110,110)}
def a():
	while __poll and Q.get_key(0)!=0:pass
	while D:
		A=Q.get_key(0)
		if A!=0:
			while __poll and Q.get_key(0)!=0:pass
			return A
def X(st,secs=P,newbest=J):
	A.set_color(255,255,255);A.fill_rect(-1,-1,321,f-2+1);A.set_color(0,0,0);A.draw_text(6,22,'MINES '+U(st[c]-q(st)))
	if st[L]:
		A.set_color(0,140,0);A.draw_text(110,22,'YOU WIN!')
		if secs is not P:A.set_color(0,90,200);A.draw_text(210,22,U(secs)+'s'+(' BEST!'if newbest else''))
	elif not st[K]:A.set_color(200,0,0);A.draw_text(150,22,'BOOM!')
def M(st,r,c,cur):
	B=st;D,E=s+c*C,f+r*C;G=B[I][r][c];J=not B[K]
	if G:
		A.set_color(200,200,200);A.fill_rect(D,E,C-1,C-1)
		if B[H][r][c]:A.set_color(0,0,0);A.fill_rect(D+5,E+5,C-10,C-10)
		elif B[O][r][c]:F=t.get(B[O][r][c],(0,0,0));A.set_color(F[0],F[1],F[2]);A.draw_text(D+5,E+C+1,U(B[O][r][c]))
	else:
		A.set_color(120,120,120);A.fill_rect(D,E,C-1,C-1)
		if B[N][r][c]:A.set_color(220,0,0);A.draw_text(D+5,E+C+1,'F')
		elif J and B[H][r][c]:A.set_color(0,0,0);A.fill_rect(D+5,E+5,C-10,C-10)
	if(r,c)==cur and B[K]and not B[L]:A.set_color(0,0,210);A.draw_rect(D+1,E+1,C-3,C-3);A.draw_rect(D+2,E+2,C-5,C-5)
def r(st,cur):
	A.clear()
	for C in B(st[F]):
		for D in B(st[G]):M(st,C,D,cur)
	X(st)
def T(y,txt):A.draw_text((319-(b(txt)*10-2))//2,y,txt)
def E(c):A.set_color(c[0],c[1],c[2])
def u(x,y,w,h,c):E(c);A.fill_rect(x,y,w,h);E((c[0]+(255-c[0])*45//100,c[1]+(255-c[1])*45//100,c[2]+(255-c[2])*45//100));A.fill_rect(x,y,w,2);A.fill_rect(x,y,2,h);E((c[0]*55//100,c[1]*55//100,c[2]*55//100));A.fill_rect(x,y+h-2,w,2);A.fill_rect(x+w-2,y,2,h)
g='HIMNE'
def v():
	if not V:return[0,0,0]
	try:A=[int(A)for A in list(Q.recall_list(g))];return(A+[0,0,0])[:3]
	except h:return[0,0,0]
def w(v):
	if V:
		try:Q.store_list(g,[float(A)for A in v])
		except h:pass
def x(di,bests):
	K=bests;C=di;E((26,26,30));A.fill_rect(-1,-1,321,211);F,L=24,5;G=(319-(L*(F+2)-2))//2
	for N in B(L):u(G+N*(F+2),28,F,F,(84,90,102))
	for(O,(P,I))in{0:('1',(70,120,230)),1:('2',(60,155,90))}.items():Q=G+O*(F+2);A.set_color(I[0],I[1],I[2]);A.draw_text(Q+8,51,P)
	M=G+2*(F+2);E((60,50,40));A.fill_rect(M+8,33,2,16);E((220,60,60));A.fill_rect(M+10,33,9,7);J=G+4*(F+2);E((20,20,24));A.fill_rect(J+7,35,10,10);A.fill_rect(J+11,31,2,18);A.fill_rect(J+3,39,18,2);E((225,80,70));T(82,'MINESWEEPER');E((210,212,218));T(112,'ENTER digs - any key flags')
	while D:
		E((26,26,30));A.fill_rect(-1,134,321,48);R,S=W[C];E((235,205,90));T(152,'< '+R+' - '+U(S)+' mines >');E((125,128,138))
		if K[C]:T(176,'best '+U(K[C])+'s   ENTER = play')
		else:T(176,'ENTER = play')
		H=a()
		if H==45:return
		elif H==24:C=(C-1)%b(W)
		elif H==26:C=(C+1)%b(W)
		elif H==105:return C
def y(di,bests):
	Q=bests;A=l(W[di][1]);R=P;C=A[F]//2,A[G]//2;r(A,C)
	while A[K]and not A[L]:
		J=a();D,E=C
		if J==45:return i
		elif J in(25,34,24,26):
			if J==25:C=(D-1)%A[F],E
			elif J==34:C=(D+1)%A[F],E
			elif J==24:C=D,(E-1)%A[G]
			else:C=D,(E+1)%A[G]
			M(A,D,E,C);M(A,C[0],C[1],C)
		elif J==105:
			if R is P:R=e.monotonic()
			U=[A[:]for A in A[I]];V=n(A,D,E,j.randint)
			for N in B(A[F]):
				for O in B(A[G]):
					if A[I][N][O]!=U[N][O]:M(A,N,O,C)
			if V==H:
				for N in B(A[F]):
					for O in B(A[G]):
						if A[H][N][O]:M(A,N,O,C)
			M(A,C[0],C[1],C);X(A)
		else:o(A,D,E);M(A,D,E,C);X(A)
	if A[L]and R is not P:
		S=int(e.monotonic()-R+.5);T=Q[di]==0 or S<Q[di]
		if T:Q[di]=S;w(Q)
		X(A,S,T)
	return'over'
def z():
	E=v();C=1
	while D:
		F=x(C,E)
		if F is P:break
		C=F;B=J
		while not B:
			if y(C,E)==i:B=D;continue
			A.set_color(0,0,210);A.fill_rect(-1,-1,321,27);A.set_color(255,255,255);A.draw_text(6,20,'ENTER=again <>menu CLEAR=menu');G=a()
			if G==45:B=D;continue
			if G in(24,26,25,34):B=D
	A.clear()
if V:z()