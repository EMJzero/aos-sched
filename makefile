
test: 
	bun test

test-%:
	./index.ts dump cfs $* | ./index.ts simulate cfs | ./index.ts export complete | tikz2pdf -p

example.png:
	bunx aos-sched dump cfs 2 | bunx aos-sched simulate cfs | bunx aos-sched export complete | tikz2pdf --output example.pdf && convert -density 300 example.pdf example.png

clean:
	rm -f tmp-*