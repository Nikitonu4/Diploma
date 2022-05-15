@Injectable()
export class CryptService {
  constructor(
    @InjectModel(Crypt)
    private readonly cryptModel: typeof Crypt,
  ) {}

  async createUsersKeys(user, userId: string): Promise<keysType> {
    const keySize = 1024;
    const keys = sfet.rsa.generateKeysSync(keySize);
    try {
      await this.cryptModel.upsert({
        user_id: userId,
        my_private_key: keys.private,
        public_key_user: user.pubKey || '',
      } as Crypt);
    } catch (e) {
      throw new ConflictException();
    }
    return keys;
  }

  async encryptData(currentUser, msg: string): Promise<Record<string, string>> {
    const user = await this.getCryptUserById(currentUser.id);
    const publicKey = user.public_key_user;
    const privateKey = user.my_private_key;
    try {
      const newMsg = await sfet.rsa.encrypt(publicKey, msg);
      const sign = sfet.rsa.sign(privateKey, newMsg);

      return {
        signature: sign,
        message: newMsg,
      };
    } catch (e) {
      throw new ForbiddenException('Error with encrypt');
    }
  }

  async decryptData(
    currentUser,
    { message: msg, signature: sign },
  ): Promise<decryptType> {
    const user = await this.getCryptUserById(currentUser.id);
    const publicKey = user.public_key_user;
    const privateKey = user.my_private_key;

    if (!sfet.rsa.verify(publicKey, msg, sign)) {
      return { status: false, decryptPassword: '' };
    }
    const res = sfet.rsa.decrypt(privateKey, msg);
    return { status: true, decryptPassword: res };
  }

  async getCryptUserById(user_id: string) {
    return this.cryptModel.findOne({
      where: {
        user_id,
      },
      attributes: ['public_key_user', 'my_private_key'],
    });
  }
}
