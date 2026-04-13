import type { PersistedState } from './types';

export function createSeedState(): PersistedState {
  return {
    currentUser: null,
    proposals: [
      {
        id: 'proposal-vote',
        title: '今晚一起吃沙县还是隆江猪脚饭？',
        creatorNickname: '吃货小美',
        creatorAvatarSeed: 'Annie',
        createdLabel: '10分钟前',
        proposalType: '外卖',
        status: '投票中',
        eventLabel: '截止: 18:00',
        expectedPeopleLabel: '预计3人',
        remark: '大家都说一下想吃啥，少数服从多数哈~ 懒得下楼了。',
        voteEnabled: true,
        joinEnabled: true,
        voteMode: 'single',
        voteOptions: [
          {
            id: 'vote-sx',
            name: '沙县小吃',
            voterNicknames: ['吃货小美', '阿强'],
          },
          {
            id: 'vote-lj',
            name: '隆江猪脚饭',
            voterNicknames: ['阿豪'],
          },
        ],
        teamMembers: [
          { nickname: '吃货小美', avatarSeed: 'Annie', isCreator: true },
          { nickname: '阿强', avatarSeed: 'Bravo' },
          { nickname: '阿豪', avatarSeed: 'Charlie' },
        ],
        maxPeople: 4,
        chatMessages: [
          {
            id: 'chat-1',
            nickname: '吃货小美',
            avatarSeed: 'Annie',
            content: '我投了沙县，主要是想吃蒸饺了。',
          },
          {
            id: 'chat-2',
            nickname: '阿强',
            avatarSeed: 'Bravo',
            content: '我也沙县吧，猪脚饭有点腻今天。',
          },
        ],
        historyLabel: '昨天 12:00',
        finalResult: '沙县小吃',
      },
      {
        id: 'proposal-group',
        title: '海底捞南山店走起！',
        creatorNickname: '火锅杀手',
        creatorAvatarSeed: 'Bob',
        createdLabel: '1小时前',
        proposalType: '到店',
        status: '组队中',
        eventLabel: '今晚 19:00',
        targetName: '海底捞南山店',
        remark: '晚饭冲一波火锅，四人成团。',
        voteEnabled: false,
        joinEnabled: true,
        voteMode: 'single',
        voteOptions: [
          {
            id: 'vote-hotpot',
            name: '海底捞南山店',
            voterNicknames: ['火锅杀手', '小周'],
          },
        ],
        teamMembers: [
          { nickname: '火锅杀手', avatarSeed: 'Bob', isCreator: true },
          { nickname: '小周', avatarSeed: 'Delta' },
        ],
        maxPeople: 4,
        chatMessages: [
          {
            id: 'chat-3',
            nickname: '火锅杀手',
            avatarSeed: 'Bob',
            content: '目前两个人，来两个就开冲。',
          },
        ],
        historyLabel: '周一',
      },
    ],
    shares: [
      {
        id: 'share-manner',
        foodName: 'Manner 冰拿铁',
        shopName: 'Manner Coffee',
        price: '18',
        rating: 4,
        comment: '每天早上都要来一杯续命，自带杯减5块很划算。',
        sharedBy: '阿西巴',
        sharedAvatarSeed: 'Echo',
        sharedAtLabel: '周二',
      },
      {
        id: 'share-burger',
        foodName: '塔斯汀汉堡套餐',
        shopName: '塔斯汀',
        price: '32',
        rating: 5,
        comment: '酱料很香，性价比高，偶尔嘴馋很合适。',
        sharedBy: '王大锤',
        sharedAvatarSeed: 'Foxtrot',
        sharedAtLabel: '周三',
      },
    ],
    wheelOptions: [
      { id: 'wheel-1', name: 'KFC' },
      { id: 'wheel-2', name: '麦当劳' },
      { id: 'wheel-3', name: '黄焖鸡米饭' },
      { id: 'wheel-4', name: '轻食沙拉' },
      { id: 'wheel-5', name: '隆江猪脚饭' },
      { id: 'wheel-6', name: '随便' },
    ],
    sessionToken: null,
    deviceId: null,
  };
}
