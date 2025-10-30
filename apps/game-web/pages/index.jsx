import React from "react";
import dynamic from "next/dynamic";
const GameRuntime = dynamic(()=>import("../components/GameRuntime"), { ssr:false });

export default function Home(){
  return <GameRuntime />;
}
