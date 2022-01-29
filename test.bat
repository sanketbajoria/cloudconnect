IF EXIST "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties" del /Q /S "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"

IF %GitBranch%==master echo VERSION=2.4.1.%GIT_COMMIT%.%BUILD_NUMBER% > "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"
IF %GitBranch%==develop echo VERSION=2.4.1.%GIT_COMMIT%.%BUILD_NUMBER% > "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"
IF %GitBranch%==hotfixes echo VERSION=2.4.1.%GIT_COMMIT%.%BUILD_NUMBER% > "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"

echo S3KEYPREFIX=S3Monitor >> "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"

IF "%Environment%"=="RelayDev" (
echo S3BUCKET=relay-hub-us-east-1-367581849394-relay >> "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"
echo INSTANCES="i-917cb044" "i-5f55e18c" >> "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"
echo NEXUSREPO=http://nexus.pbi.global.pvt:8080/nexus/content/repositories/PBNexusSnapshot/com/pb/relay/ >> "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"
)
IF "%Environment%"=="RelayStaging" (
echo S3BUCKET=relay-hub-staging-us-east-1-367581849394-relay >> "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"
echo INSTANCES="i-98c36611" "i-58cb15d1" >> "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"
echo NEXUSREPO=http://nexus.pbi.global.pvt:8080/nexus/content/repositories/PBNexusSnapshot/com/pb/relay/ >> "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"
)
IF "%Environment%"=="RelayQA" (
echo S3BUCKET=relay-hub-qa-us-east-1-367581849394-relay >> "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"
echo INSTANCES="i-92378d41" >> "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"
echo NEXUSREPO=http://nexus.pbi.global.pvt:8080/nexus/content/repositories/PBNexusSnapshot/com/pb/relay/ >> "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"
)
IF "%Environment%"=="RelayDevNext" (
echo S3BUCKET=relay-hub-dev-next-us-east-1-367581849394-relay >> "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"
echo INSTANCES="i-433decda" >> "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"
echo NEXUSREPO=http://nexus.pbi.global.pvt:8080/nexus/content/repositories/PBNexusSnapshot/com/pb/relay/ >> "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"
)
IF "%Environment%"=="RelayEUProd" echo NEXUSREPO=http://nexus.pbi.global.pvt:8080/nexus/content/repositories/PBNexusRelease/com/pb/relay/ >> "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"
IF "%Environment%"=="RelayUSProd" echo NEXUSREPO=http://nexus.pbi.global.pvt:8080/nexus/content/repositories/PBNexusRelease/com/pb/relay/ >> "%WORKSPACE%\ddmh-s3-monitor\S3MonitorBuild.properties"