async findOneWithBasicInfo(
    entry_id: number,
    currentUser,
    req,
  ): Promise<Record<string, any>> {
    const entry = await this.entrysRepository.findByPk(entry_id, {
      raw: true,
      attributes: [
        [Sequelize.literal('CONCAT(\'e\', "Entry".entry_id)'), 'uniq_id'],
        ['entry_id', 'id'],
        'name',
        'comment',
        'parent_id',
        'type',
        [Sequelize.literal('array_agg(tagss.name)'), 'tags'],
      ],
      group: ['Entry.entry_id', 'Entry.name'],
      include: [
        {
          model: Tag,
          as: 'tagss',
          attributes: [],
          through: {
            attributes: [],
          },
        },
      ],
    });

    if (!entry) {
      throw new NotFoundException('Password are not exist');
    }

    const parentFolder = await this.foldersRepository.findByPk(entry.parent_id);
    const { access } = await this.accessService.isAccess(
      entry.parent_id,
      parentFolder.owner_id,
      currentUser,
      req,
    );

    if (!access) {
      throw new ForbiddenException('Do not have access to entry');
    }

    try {
      if (entry.tags[0] === null) {
        entry.tags = [];
      }
      return {
        ...entry,
        is_subscribe: await this.subscribesService.isInSubscribes(
          currentUser?.id,
          'e',
          entry_id,
        ),
        is_favorite: await this.favouritesService.isInFavourites(
          currentUser?.id,
          'e',
          entry_id,
        ),
      };
    } catch (e) {
      throw new NotFoundException('Password are not exist');
    }
  }
