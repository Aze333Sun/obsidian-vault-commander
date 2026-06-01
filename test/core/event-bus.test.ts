import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/core/event-bus';

describe('EventBus', () => {
  it('应该注册并触发事件', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('test:event', handler);
    bus.emit('test:event', { data: 42 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ data: 42 });
  });

  it('应该支持多个监听器', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();

    bus.on('test', h1);
    bus.on('test', h2);
    bus.emit('test');

    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('应该正确取消监听', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    const unsub = bus.on('test', handler);
    unsub();
    bus.emit('test');

    expect(handler).not.toHaveBeenCalled();
  });

  it('once 应该只触发一次', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.once('test', handler);
    bus.emit('test');
    bus.emit('test');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('应该捕获监听器错误', () => {
    const bus = new EventBus();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    bus.on('test', () => {
      throw new Error('oops');
    });
    bus.emit('test');

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('clear 应该移除所有监听器', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('test', handler);
    bus.clear();
    bus.emit('test');

    expect(handler).not.toHaveBeenCalled();
  });
});
