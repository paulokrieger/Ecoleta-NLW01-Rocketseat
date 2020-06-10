import { Request, Response } from 'express';
import knex from '../database/connection';

class PointsController {
  async index(request: Request, response: Response) {
    const { city, uf, items } = request.query;
    // transformar os ids de item vindo em um array
    let parsedItems = [];
    if (!Array.isArray(items)) {
      parsedItems = String(items)
        .split(',')
        .map(item => Number(item.trim()));
    } else {
      parsedItems = [...items];
    }

    let points = [];
    // se o usuario nao inserir um ou mais itens, mostrar todos os pontos da cidade
    if (parsedItems.length < 1 || items) {
      points = await knex('points')
        .join('point_items', 'points.id', '=', 'point_items.point_id')
        .where('city', String(city))
        .where('uf', String(uf))
        .distinct()
        .select('points.*')
    } else {
      // aplicacao dos filtros relacionados a tabela point items
      points = await knex('points')
        .join('point_items', 'points.id', '=', 'point_items.point_id')
        .whereIn('point_items.item_id', parsedItems as number[])
        .where('city', String(city))
        .where('uf', String(uf))
        .distinct()
        .select('points.*')
    }

    const serializedPoints = points.map(point => {
      return {
        ...point,
        image_url: `http://192.168.20.242:3333/uploads/${point.image}`,
      };
    });
    return response.json(serializedPoints);

  }

  async show(request: Request, response: Response) {
    const { id } = request.params;

    const point = await knex('points').where('id', id).first();

    if (!point) {
      return response.status(400).json({ message: 'Point not found' });
    }

    const serializedPoint = {
      ...point,
      image_url: `http://192.168.20.242:3333/uploads/${point.image}`,
    };

    /**
     * SELECT * FROM items
     * JOIN point_items ON items.id = point_items.item_id
     * WHERE point_items.point_id = id
     */

    const items = await knex('items').join('point_items', 'items.id', '=', 'point_items.item_id')
      .where('point_items.point_id', id).select('items.title');

    return response.json({ point: serializedPoint, items });

  }

  async create(request: Request, response: Response) {
    const {
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      address,
      number,
      neighborhood,
      city,
      uf,
      items
    } = request.body;

    const point = {
      image: request.file.filename,
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      address,
      number,
      neighborhood,
      city,
      uf,
    }
    // utilizado para executar de forma correta, pois se der problema no 2 insert, nao realizar o 1
    const trx = await knex.transaction();

    //inserir ponto na tabela
    const insertedIds = await trx('points').insert(point);

    // quando criar linhas na tabela, ele retorna o id dessa linha. como isnerimos apenas um ponto
    const point_id = insertedIds[0];


    const pointItems = items
      .split(',')
      .map((item: string) => Number(item.trim()))
      .map((item_id: number) => {
        return {
          item_id,
          point_id
        };
      })

    // inserir os pont_items dentro da tabela
    await trx('point_items').insert(pointItems);

    await trx.commit();

    return response.json({
      id: point_id,
      ...point,
    });
  }
}

export default PointsController;


