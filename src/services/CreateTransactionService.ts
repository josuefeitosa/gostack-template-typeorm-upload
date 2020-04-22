import { getRepository, getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    if (type !== 'income' && type !== 'outcome') {
      throw new AppError(
        'Tipo de transação inválido. Utilizar income ou outcome.',
        400,
      );
    }

    if (typeof value !== 'number') {
      throw new AppError(
        'Formato de value incorreto. Utilizar formato de número.',
        400,
      );
    }

    const balance = await transactionsRepository.getBalance();
    if (type === 'outcome' && balance.total - value < 0) {
      throw new AppError(
        'Não é possível adicionar saída sem saldo suficiente.',
        400,
      );
    }

    const existingCategory = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (!existingCategory) {
      const createdCategory = categoriesRepository.create({ title: category });
      await categoriesRepository.save(createdCategory);

      const transaction = transactionsRepository.create({
        title,
        value,
        type,
        category_id: createdCategory.id,
      });

      await transactionsRepository.save(transaction);

      return transaction;
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: existingCategory.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
