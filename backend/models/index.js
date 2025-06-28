const { Sequelize, DataTypes } = require("sequelize");
const path = require("path");

// SQLite 데이터베이스 초기화
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: path.join(__dirname, "../database.sqlite"),
  logging: false, // 프로덕션에서는 false로 설정
});

// User 모델 정의
const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        len: [5, 254], // RFC 5321 표준에 따른 이메일 길이 제한
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 128], // 패스워드 길이 제한
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100], // 이름 길이 제한
        is: /^[a-zA-Z가-힣\s]+$/, // 알파벳, 한글, 공백만 허용
      },
    },
    role: {
      type: DataTypes.ENUM("mentor", "mentee"),
      allowNull: false,
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000], // bio 길이 제한
      },
    },
    skills: {
      type: DataTypes.TEXT, // JSON 형태로 저장
      allowNull: true,
      get() {
        const value = this.getDataValue("skills");
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue("skills", JSON.stringify(value));
      },
    },
    experience: {
      type: DataTypes.INTEGER,
      allowNull: true, // 멘토의 경험 년수
    },
    hourlyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true, // 멘토의 시간당 요금
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
  },
);

// MatchingRequest 모델 정의
const MatchingRequest = sequelize.define(
  "MatchingRequest",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    menteeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    mentorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500], // 메시지 길이 제한
      },
    },
    status: {
      type: DataTypes.ENUM("pending", "accepted", "rejected"),
      defaultValue: "pending",
    },
  },
  {
    timestamps: true,
  },
);

// 관계 설정
User.hasMany(MatchingRequest, { as: "sentRequests", foreignKey: "menteeId" });
User.hasMany(MatchingRequest, {
  as: "receivedRequests",
  foreignKey: "mentorId",
});
MatchingRequest.belongsTo(User, { as: "mentee", foreignKey: "menteeId" });
MatchingRequest.belongsTo(User, { as: "mentor", foreignKey: "mentorId" });

// 데이터베이스 초기화 함수
const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    // 테이블 동기화
    await sequelize.sync({ force: false });
    console.log("All models were synchronized successfully.");

    return sequelize;
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  MatchingRequest,
  initDatabase,
};
