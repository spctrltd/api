SOURCE_DIR=$(pwd)
PUBLISH_DIR=$(pwd)/../spctr-api-publish

publish() {
	NEWLINE=__N__
	rm -rf $PUBLISH_DIR
	mkdir $PUBLISH_DIR
	sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/'$NEWLINE'/g' $SOURCE_DIR/package.json > $PUBLISH_DIR/package1__tmp
	sed -e 's/"devDependencies": {\([^}]*\)}[,]\{0,1\}//' $PUBLISH_DIR/package1__tmp > $PUBLISH_DIR/package2__tmp
	sed -e 's/"scripts": {\([^}]*\)}[,]\{0,1\}/"scripts": {'$NEWLINE'"test": "echo \\"No test specified\\""'$NEWLINE'},'$NEWLINE'/' $PUBLISH_DIR/package2__tmp > $PUBLISH_DIR/package3__tmp
	sed -e 's/'$NEWLINE'/\n/g' $PUBLISH_DIR/package3__tmp > $PUBLISH_DIR/package4__tmp
	sed -e 's/"version": "\(.*\)"/"version": "'$1'"/' $PUBLISH_DIR/package4__tmp > $PUBLISH_DIR/package.json
	rm -rf $PUBLISH_DIR/*__tmp
	JSON=$(node -p "JSON.stringify(JSON.parse(require('fs').readFileSync(process.argv[1])), null, 4)" $PUBLISH_DIR/package.json)
	echo $JSON | python3 -m json.tool > $PUBLISH_DIR/package.json
	cp -rf {index.js,src,README.md} $PUBLISH_DIR/
	cd $PUBLISH_DIR
	npm publish --access public
}

updateversion() {
	VERSION=$(sed -n 's/"version": "\(.*\)"[,]\{0,1\}/\1/p' $PUBLISH_DIR/package.json)
	echo $VERSION
}

case "$1" in
    version)
       publish $2
       exit 0
    ;;
    updateversion)
       updateversion
       exit 0
    ;;
    **)
        echo "Usage: $0 {updateversion|version} {version number}" 1>&2
        exit 1
    ;;
esac
