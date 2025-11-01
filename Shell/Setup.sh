#! /bin/bash
clear
package="/node_modules"
mode="--starting"
#Kiem tra thu muc chua package
#neu chua ton tai thi tien hanh cai dat
if [ -d  "$package" ]
then
script1="npm run start"
eval "
$script1;
"
else
echo "Tiến hành cài đặt thư viện cho Gbot"
sleep 2
npm install
sleep 2
#Ket thuc kiem tra
RED=''
NC=''
clear
#script1="node login --starting"
script2="node login --starting"
eval "
$script2;
"
fi