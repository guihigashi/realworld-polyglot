addDependencyTreePlugin
addSbtPlugin("com.thesamet" % "sbt-protoc" % "1.1.0-RC2")

libraryDependencies ++= Seq(
  "com.thesamet.scalapb"          %% "compilerplugin"   % "0.11.20",
  "com.thesamet.scalapb.zio-grpc" %% "zio-grpc-codegen" % "0.6.3",
)
