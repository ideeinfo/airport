export type AirflowAlarmContext = {
  alarmId: string;
  assetCode: string;
  assetName: string;
  ifcGlobalId: string;
  location: string;
  currentAirflow: number;
  referenceAirflow: number;
  durationMinutes: number;
};

export const airflowAlarm: AirflowAlarmContext = {
  alarmId: "ALM-AIR-5466537",
  assetCode: "5466537",
  assetName: "500×500 单层百叶风口",
  ifcGlobalId: "2LnU_nN4n7j8uYrOc9CFQf",
  location: "AR_-7.000",
  currentAirflow: 620,
  referenceAirflow: 850,
  durationMinutes: 12
};

export function airflowDeviationPercent(alarm: AirflowAlarmContext = airflowAlarm): number {
  return Math.round((alarm.currentAirflow - alarm.referenceAirflow) / alarm.referenceAirflow * 100);
}

export function buildAirflowAssistantQuestion(alarm: AirflowAlarmContext = airflowAlarm): string {
  return `报警 ${alarm.alarmId}：B1层 ${alarm.location} 的${alarm.assetName}（IFC构件 ${alarm.assetCode}）当前风量为 ${alarm.currentAirflow} m³/h，参考风量为 ${alarm.referenceAirflow} m³/h。图谱已定位 IFC 连接路径 ${alarm.assetCode} → 风管5466492，并以Demo补充关系关联 SA 94 → AHU-0B2-04。请结合知识库说明：先查哪里、再查哪里、使用什么测量工具、测量与判定依据是什么，并区分手册明确规定与一般工程建议。`;
}

export const airflowContextChips = [
  `报警 ${airflowAlarm.alarmId}`,
  `IFC ${airflowAlarm.assetCode}`,
  `空间 ${airflowAlarm.location}`,
  "路径 风口→风管→SA 94→AHU-0B2-04"
];
