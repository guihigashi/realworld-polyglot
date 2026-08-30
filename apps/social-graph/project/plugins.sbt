addDependencyTreePlugin
addSbtPlugin("io.spray" % "sbt-revolver" % "0.10.0")
addSbtPlugin("com.thesamet" % "sbt-protoc" % "1.1.0-RC2")
addSbtPlugin("com.github.sbt" % "sbt-native-packager" % "1.11.7")

libraryDependencies ++= Seq(
  "com.thesamet.scalapb"          %% "compilerplugin"   % "0.11.20",
  "com.thesamet.scalapb.zio-grpc" %% "zio-grpc-codegen" % "0.6.3",
)
