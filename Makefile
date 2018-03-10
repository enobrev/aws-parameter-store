.PHONY : build production watch clean

build: clean production

production:
	babel ./src --out-dir ./dist

watch:
	babel ./src --source-maps --watch --out-dir ./dist

clean:
	rm ./dist -Rf