scalaVersion := "3.8.4"
scalacOptions ++= Seq(
  "-Wunused:all",
  "-deprecation",
  "-Wconf:src=.*/src_managed/.*:silent"
)

lazy val zioVersion        = "2.1.26"
lazy val zioConfigVersion  = "4.0.8"
lazy val zioLoggingVersion = "2.5.3"
lazy val grpcJavaVersion   = "1.83.1"

lazy val root = project
  .in(file("."))
  .settings(
    name         := "Social Graph",
    version      := "0.1.0-SNAPSHOT",
    scalaVersion := "3.8.4",

    libraryDependencies ++= Seq(
      "dev.zio" %% "zio"               % zioVersion,
      "dev.zio" %% "zio-test"          % zioVersion % Test,
      "dev.zio" %% "zio-test-magnolia" % zioVersion % Test,
      "dev.zio" %% "zio-test-sbt"      % zioVersion % Test,

      "dev.zio" %% "zio-config"                % zioConfigVersion,
      "dev.zio" %% "zio-config-magnolia"       % zioConfigVersion,
      "dev.zio" %% "zio-config-typesafe"       % zioConfigVersion,
      "dev.zio" %% "zio-logging"               % zioLoggingVersion,
      "dev.zio" %% "zio-logging-slf4j2-bridge" % zioLoggingVersion,

      "dev.zio"      %% "zio-interop-cats" % "23.1.0.13",
      "org.tpolecat" %% "skunk-core"       % "2.0.0-RC2",

      "io.grpc"               % "grpc-netty"           % grpcJavaVersion,
      "io.grpc"               % "grpc-services"        % grpcJavaVersion,
      "com.thesamet.scalapb" %% "scalapb-runtime-grpc" % scalapb.compiler.Version.scalapbVersion,
    )
  )

Compile / PB.targets := Seq(
  scalapb.gen()                     -> (Compile / sourceManaged).value,
  scalapb.zio_grpc.ZioCodeGenerator -> (Compile / sourceManaged).value
)
