const express = require("express");
const neo4j = require("neo4j-driver");
const app = express();
const path = require("path");
const cors = require("cors");

// Express 설정
app.use(cors());
app.use(express.json());
app.set("trust proxy", true); // 프록시 신뢰 활성화

// Neo4j 설정
const driver = neo4j.driver(
  "bolt+s://18c363b9.databases.neo4j.io:7687", 
  neo4j.auth.basic("neo4j", "G-nOZZdbqIVLjHPrdRwk5Xk72vqO8_JmKYn-YwHqxOs")
);
const session = driver.session();

// 새로운 기록 추가
app.post("/add-ranking", async (req, res) => {
  const { nickname, score } = req.body;

  // 클라이언트 IP 가져오기
  const clientIp = req.headers["x-forwarded-for"]
    ? req.headers["x-forwarded-for"].split(",")[0]
    : req.connection.remoteAddress || req.socket.remoteAddress || "127.0.0.1";

  console.log("Client IP detected:", clientIp);

  try {
    // Geo 데이터 가져오기
    const fetch = (await import("node-fetch")).default;
    const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}`);
    const geoData = await geoResponse.json();

    // 국가 정보 확인
    const country = geoData?.country || "Unknown";
    console.log("Country detected:", country);

    // Neo4j에 데이터 저장
    await session.run(
      `CREATE (r:Ranking {nickname: $nickname, score: $score, country: $country})`,
      { nickname, score, country }
    );

    console.log(`Ranking created: Nickname=${nickname}, Score=${score}, Country=${country}`);
    res.status(200).send("Ranking updated");
  } catch (error) {
    console.error("Error updating ranking:", error);
    res.status(500).send("Error updating ranking");
  }
});

// 랭킹 조회
app.get("/rankings", async (req, res) => {
  try {
    const result = await session.run(`
      MATCH (r:Ranking)
      RETURN r.nickname AS nickname, r.score AS score, r.country AS country
      ORDER BY r.score DESC
      LIMIT 100
    `);

    const rankings = result.records.map((record) => ({
      nickname: record.get("nickname"),
      score: record.get("score"),
      country: record.get("country"),
    }));

    res.status(200).json(rankings);
  } catch (error) {
    console.error("Error fetching rankings:", error);
    res.status(500).send("Error fetching rankings");
  }
});

// 테스트용 IP 확인 엔드포인트
app.get("/test-ip", async (req, res) => {
  try {
    const clientIp = req.headers["x-forwarded-for"]
      ? req.headers["x-forwarded-for"].split(",")[0]
      : req.connection.remoteAddress || req.socket.remoteAddress || "127.0.0.1";

    const fetch = (await import("node-fetch")).default;
    const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}`);
    const geoData = await geoResponse.json();

    console.log("Geo data test:", geoData);
    res.status(200).json(geoData);
  } catch (error) {
    console.error("IP API Test Error:", error);
    res.status(500).send("IP API Test Failed");
  }
});

// 정적 파일 제공
app.use(express.static(path.join(__dirname, "public")));

// 서버 실행
app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
