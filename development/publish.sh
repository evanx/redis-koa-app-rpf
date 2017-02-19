
set -u -e -x

  version=`npm version | head -1 |
     sed "s/.*'\([0-9].*\)',/\1/"`
  publishedVersion=`npm info | grep latest | 
     sed "s/.*'\([0-9].*\)'.*/\1/"`
  [ "$version" != "$publishedVersion" ]

  git add -A
  git commit -m 'publish'
  git push

  npm publish
