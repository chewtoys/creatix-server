import Joi from 'joi';
import { Request, Response } from 'express';
import { Resolvers } from '../../../typings/resolvers';
import privateResolver from '../../../lib/privateResolver';
import {
  escapeForUrl,
  generateSlugId,
  invalidUrlSlug,
  invalidText,
  filterUnique,
  checkUser
} from '../../../lib/utils';
import { WriteIllustMutationArgs, WriteIllustMutationResponse } from './WriteIllust.typing';
import { getRepository } from 'typeorm';
import Illust from 'src/entity/Illust';

const resolvers: Resolvers = {
  Mutation: {
    WriteIllust: privateResolver(
      async (
        _,
        args: WriteIllustMutationArgs,
        { req, res }: { req: Request; res: Response }
      ): Promise<WriteIllustMutationResponse> => {
        const userId: string = req['user_id'];
        if (!checkUser(userId)) {
          return {
            ok: false,
            error: '404_USER_NOT_FOUND'
          };
        }

        const schema = Joi.object().keys({
          title: Joi.string()
            .required()
            .trim()
            .min(1)
            .max(120),
          description: Joi.string(),
          thumbnail: Joi.array()
            .items(Joi.string())
            .required(),
          tags: Joi.array().items(Joi.string()),
          url_slug: Joi.string()
            .trim()
            .min(1)
            .max(130),
          is_private: Joi.boolean().required()
        });

        const result = Joi.validate(args, schema);

        // validate error
        if (result.error) {
          return {
            ok: false,
            error: '404_WRITE_ILLUST_VALIDATION_ERROR'
          };
        }

        const { title, description, tags, url_slug, is_private, thumbnail } = args;
        const illustRepo = getRepository(Illust);

        const uniqueUrlSlug = escapeForUrl(`${title} ${generateSlugId()}`);
        const userUserSlug = url_slug ? escapeForUrl(url_slug) : '';

        let processedSlug = url_slug ? userUserSlug : uniqueUrlSlug;

        if (url_slug) {
          try {
            const [allIllust, exists] = await illustRepo.findAndCount({
              where: {
                url_slug,
                fk_user_id: ''
              }
            });

            if (allIllust && exists > 0) {
              processedSlug = uniqueUrlSlug;
            }
          } catch (e) {
            throw new Error(e);
          }
        }

        if (!invalidText(title, thumbnail)) {
          return {
            ok: false,
            error: '400_INVALID_TEXT'
          };
        }

        if (!invalidUrlSlug(processedSlug)) {
          return {
            ok: false,
            error: '400_INVALID_URL_SLUG'
          };
        }

        const uniqueTags = tags ? filterUnique(tags) : [];
        const uniqueUrls = filterUnique(thumbnail);
        console.log(uniqueTags, uniqueUrls);

        try {
          return {
            ok: true,
            error: null
          };
        } catch (e) {
          throw new Error(e);
        }
      }
    )
  }
};

export default resolvers;
