# More games at ti84calcwiz.com
o='draw'
n='lose'
m='win'
l='Draw.'
k='CONNECT FOUR'
j=Exception
d=None
b=str
W='quit'
V=print
H=False
G=range
D=True
import random
try:import ti_draw as A,ti_system as N;Q=D
except ImportError:
	import sys
	if sys.implementation.name=='tipython':V('This program needs ti_draw,');V('which your calculator is');V('missing. 2-minute fix:');V('calcplex.com/ti-draw-fix');raise SystemExit
	Q=H
B,L=7,6
E,I,F=1,2,0
def e():return[[F]*B for A in G(L)]
def O(b):return[A for A in G(B)if b[0][A]==F]
def X(b,c):
	for A in G(L-1,-1,-1):
		if b[A][c]==F:return A
def R(b,c,p):
	A=X(b,c)
	if A is d:return
	b[A][c]=p;return A
def S(b):
	for D in G(L):
		for E in G(B):
			C=b[D][E]
			if C==F:continue
			for(J,K)in((0,1),(1,0),(1,1),(1,-1)):
				A=1
				while A<4:
					H,I=D+J*A,E+K*A
					if 0<=H<L and 0<=I<B and b[H][I]==C:A+=1
					else:break
				if A==4:return C
	return F
def Y(b,c,p):
	A=X(b,c)
	if A is d:return H
	b[A][c]=p;B=S(b)==p;b[A][c]=F;return B
def f(b):
	C=O(b)
	for A in C:
		if Y(b,A,I):return A
	for A in C:
		if Y(b,A,E):return A
	G=sorted(C,key=lambda c:abs(c-B//2));D=[]
	for A in G:
		H=X(b,A);b[H][A]=I;J=any(Y(b,A,E)for A in O(b));b[H][A]=F
		if not J:D.append(A)
	if D:return D[0]
	return G[0]
P,Z,a,T=44,28,8,34
p={F:(235,235,245),E:(210,40,40),I:(235,200,40)}
def M():
	while N.get_key(0)!=0:pass
	while D:
		A=N.get_key(0)
		if A!=0:
			while N.get_key(0)!=0:pass
			return A
def c(b,r,c):B=p[b[r][c]];A.set_color(B[0],B[1],B[2]);A.fill_rect(a+c*P+4,T+r*Z+3,P-8,Z-6)
def J(cur,on,col=(0,0,0)):
	B=col;C=a+cur*P+P//2
	if on:A.set_color(B[0],B[1],B[2])
	else:A.set_color(255,255,255)
	A.fill_rect(C-7,T-11,14,7)
def U(msg):A.set_color(255,255,255);A.fill_rect(-1,-1,321,T-12+1);A.set_color(0,0,0);A.draw_text(6,20,msg)
def g(b,cur,msg,mcol=(0,0,0)):
	A.clear();U(msg);A.set_color(40,70,170);A.fill_rect(a,T,B*P,L*Z)
	for C in G(L):
		for E in G(B):c(b,C,E)
	J(cur,D,mcol)
def K(y,txt):A.draw_text((319-(len(txt)*10-2))//2,y,txt)
def C(c):A.set_color(c[0],c[1],c[2])
def q(x,y,w,h,c):C(c);A.fill_rect(x,y,w,h);C((c[0]+(255-c[0])*45//100,c[1]+(255-c[1])*45//100,c[2]+(255-c[2])*45//100));A.fill_rect(x,y,w,2);A.fill_rect(x,y,2,h);C((c[0]*55//100,c[1]*55//100,c[2]*55//100));A.fill_rect(x,y+h-2,w,2);A.fill_rect(x+w-2,y,2,h)
h='C4REC'
def r():
	if not Q:return[0,0,0]
	try:A=[int(A)for A in list(N.recall_list(h))];return(A+[0,0,0])[:3]
	except j:return[0,0,0]
def s(v):
	if Q:
		try:N.store_list(h,[float(A)for A in v])
		except j:pass
def i(rec):A=rec;return'YOU '+b(A[0])+' - CPU '+b(A[1])+' - TIE '+b(A[2])
def t(rec,mode):
	I=mode;H=rec;C((16,22,46));A.fill_rect(-1,-1,321,211);N,O,B=5,3,16;P,T=N*B+4,O*B+4;Q=(320-P)//2;R=18;q(Q,R,P,T,(40,70,170));F,J=(225,70,70),(245,205,70);U={(0,2):F,(1,2):J,(2,2):F,(3,2):J,(4,2):F,(1,1):J,(2,1):F,(3,1):J,(2,0):F}
	for E in G(N):
		for S in G(O):L=U.get((E,S),(20,28,58));A.set_color(L[0],L[1],L[2]);A.fill_rect(Q+4+E*B,R+4+S*B,B-4,B-4)
	C((255,210,70));K(102,k)
	if H[0]or H[1]or H[2]:C((235,205,90));K(126,i(H))
	while D:
		C((16,22,46));A.fill_rect(-1,138,321,52);C((210,218,235));K(156,'< 1 PLAYER vs AI >'if I==0 else'< 2 PLAYERS >');C((120,130,165));K(182,'ENTER = play');E=M()
		if E==45:return
		elif E in(24,26):I=1-I
		elif E==105:return I
def u(ai_first):
	T=ai_first;A=e();C=B//2
	if T:R(A,f(A),I)
	g(A,C,'CPU started'if T else'You start (RED)',(210,40,40))
	while D:
		N=M()
		if N==45:return W
		if N==24:J(C,H);C=(C-1)%B;J(C,D,(210,40,40))
		elif N==26:J(C,H);C=(C+1)%B;J(C,D,(210,40,40))
		elif N in(105,34)and A[0][C]==F:
			V=[A[:]for A in A];R(A,C,E);K=S(A)
			if K==F and O(A):R(A,f(A),I);K=S(A)
			for P in G(L):
				for Q in G(B):
					if A[P][Q]!=V[P][Q]:c(A,P,Q)
			if K or not O(A):U('You WIN!'if K==E else'Calculator wins.'if K==I else l);M();return m if K==E else n if K==I else o
def v():
	P='RED to move';G=e();A=B//2;C=E;K={E:(210,40,40),I:(235,200,40)};g(G,A,P,K[C])
	while D:
		L=M()
		if L==45:return W
		if L==24:J(A,H);A=(A-1)%B;J(A,D,K[C])
		elif L==26:J(A,H);A=(A+1)%B;J(A,D,K[C])
		elif L in(105,34)and G[0][A]==F:
			Q=R(G,A,C);c(G,Q,A);N=S(G)
			if N or not O(G):U('RED wins!'if N==E else'YELLOW wins!'if N==I else l);M();return'over'
			C=I if C==E else E;J(A,D,K[C]);U(P if C==E else'YELLOW to move')
def w():
	E=r();G=H;F=0
	while D:
		I=t(E,F)
		if I is d:break
		F=I;B=D
		while B:
			if F==0:
				J=u(G)
				if J==W:B=H;continue
				E[{m:0,n:1,o:2}[J]]+=1;s(E);G=not G
			elif v()==W:B=H;continue
			C((16,22,46));A.fill_rect(-1,-1,321,211);C((255,210,70));K(60,k)
			if F==0:C((235,205,90));K(96,i(E))
			C((120,130,165));K(132,'ENTER = play again');K(158,'<- -> back to menu');K(184,'CLEAR = quit');L=M()
			if L==45:B=H;continue
			if L in(24,26):B=H
	A.clear()
if Q:w()