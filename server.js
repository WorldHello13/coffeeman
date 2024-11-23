const express = require("express");
const neo4j = require("neo4j-driver");
const app = express();
const path = require('path');
const cors = require("cors");

app.use(cors());
app.use(express.json());
app.set("trust proxy", true);

// Neo4j 드라이버 설정
const driver = neo4j.driver("bolt+s://18c363b9.databases.neo4j.io:7687", neo4j.auth.basic("neo4j", "G-nOZZdbqIVLjHPrdRwk5Xk72vqO8_JmKYn-YwHqxOs"));
const session = driver.session();



// 새로운 기록 추가
app.post("/add-ranking", async (req, res) => {
  const { nickname, score } = req.body;
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  try {
        // IP 기반 국가 정보 API 호출 (ip-api 사용 예)
    const fetch = (await import("node-fetch")).default;

    const geoResponse = await fetch(`http://ip-api.com/json/${req.socket.remoteAddress}`);
    const geoData = await geoResponse.json();
    console.log("Geo data:", geoData);
    const country = geoData.country || "Unknown"; // 국가 이름 가져오기
    const result = await session.run(`
      MATCH (r:Ranking)
      WITH r
      ORDER BY r.score DESC
      SKIP 99
      LIMIT 1
      DETACH DELETE r
    `);

    await session.run(`
      CREATE (r:Ranking {nickname: $nickname, score: $score, country: $country})
    `, { nickname, score, country });

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
      RETURN r.nickname AS nickname, r.score AS score
      ORDER BY r.score DESC
      LIMIT 100
    `);

    const rankings = result.records.map(record => ({
      nickname: record.get("nickname"),
      score: record.get("score"),
    }));

    res.status(200).json(rankings);
  } catch (error) {
    res.status(500).send("Error fetching rankings");
  }
});

app.post("/add-ranking", async (req, res) => {
  const { nickname, score } = req.body;
  console.log("Received new score submission:", { nickname, score }); // 디버깅 로그
  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
  console.log("Client IP detected:", clientIp); 

  try {
    const fetch = (await import("node-fetch")).default;

    const geoResponse = await fetch(`http://ip-api.com/json/${req.socket.remoteAddress}`);
    const geoData = await geoResponse.json();
    const country = geoData.country || "Unknown";

    console.log("Geo data:", geoData); // IP 관련 데이터 확인

    // Neo4j에 데이터 추가
    await session.run(`
      CREATE (r:Ranking {nickname: $nickname, score: $score, country: $country})
    `, { nickname, score, country });

    res.status(200).send("Ranking updated");
  } catch (error) {
    console.error("Error updating ranking:", error);
    res.status(500).send("Error updating ranking");
  }
});

app.get("/test-ip", async (req, res) => {
  try {
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    const fetch = (await import("node-fetch")).default;

    const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}`);
    const geoData = await geoResponse.json();

    res.status(200).json(geoData);
  } catch (error) {
    console.error("IP API Test Error:", error);
    res.status(500).send("IP API Test Failed");
  }
});


// 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));



// 서버 시작
app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
