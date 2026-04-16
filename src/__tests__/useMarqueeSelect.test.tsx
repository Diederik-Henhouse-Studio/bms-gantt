import React, { useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useGanttStore } from '../store';
import { getTasksInMarquee, useMarqueeSelect } from '../hooks/useMarqueeSelect';
import { createTask } from './helpers';

function MarqueeHarness() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { marqueeRect, handleMarqueeMouseDown } = useMarqueeSelect({
    scrollContainerRef: scrollRef,
    totalWidth: 1000,
    totalHeight: 1000,
  });

  return (
    <div ref={scrollRef} data-testid="scroll">
      <div data-testid="content" onMouseDown={handleMarqueeMouseDown}>
        <div data-testid="task-bar" data-gantt-task-id="blocked" />
        {marqueeRect && <div data-testid="marquee" />}
      </div>
    </div>
  );
}

function mockScrollBounds() {
  const scroll = screen.getByTestId('scroll');
  scroll.getBoundingClientRect = () =>
    ({
      left: 10,
      top: 20,
      right: 1010,
      bottom: 1020,
      width: 1000,
      height: 1000,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    }) as DOMRect;
}

describe('getTasksInMarquee', () => {
  afterEach(() => {
    useGanttStore.setState({
      flatTasks: [],
      selectedTaskIds: [],
      selectedLinkId: null,
    });
  });

  it('returns tasks whose bars overlap the marquee rectangle', () => {
    const tasks = [
      createTask({ id: 'before', $x: 0, $y: 0, $w: 20, $h: 20 }),
      createTask({ id: 'inside', $x: 40, $y: 40, $w: 20, $h: 20 }),
      createTask({ id: 'overlap-edge', $x: 70, $y: 70, $w: 20, $h: 20 }),
      createTask({ id: 'after', $x: 120, $y: 120, $w: 20, $h: 20 }),
    ];

    expect(
      getTasksInMarquee(tasks, { left: 30, top: 30, width: 50, height: 50 }),
    ).toEqual(['inside', 'overlap-edge']);
  });

  it('uses all task geometry, including rows that may not be rendered', () => {
    const tasks = [
      createTask({ id: 'visible-row', $x: 10, $y: 20, $w: 30, $h: 20 }),
      createTask({ id: 'virtual-row', $x: 10, $y: 5000, $w: 30, $h: 20 }),
    ];

    expect(
      getTasksInMarquee(tasks, { left: 0, top: 4990, width: 100, height: 60 }),
    ).toEqual(['virtual-row']);
  });

  it('replaces selection with tasks selected from an empty chart drag', () => {
    useGanttStore.setState({
      flatTasks: [
        createTask({ id: 'hit', $x: 15, $y: 15, $w: 10, $h: 10 }),
        createTask({ id: 'miss', $x: 200, $y: 200, $w: 10, $h: 10 }),
      ],
      selectedTaskIds: ['old'],
      selectedLinkId: 'link-1',
    });

    render(<MarqueeHarness />);
    mockScrollBounds();

    fireEvent.mouseDown(screen.getByTestId('content'), {
      button: 0,
      clientX: 20,
      clientY: 30,
    });
    fireEvent.mouseMove(document, { clientX: 50, clientY: 60 });
    fireEvent.mouseUp(document, { clientX: 50, clientY: 60 });

    expect(useGanttStore.getState().selectedTaskIds).toEqual(['hit']);
    expect(useGanttStore.getState().selectedLinkId).toBeNull();
  });

  it('adds to existing selection when shift is held', () => {
    useGanttStore.setState({
      flatTasks: [createTask({ id: 'hit', $x: 15, $y: 15, $w: 10, $h: 10 })],
      selectedTaskIds: ['existing'],
    });

    render(<MarqueeHarness />);
    mockScrollBounds();

    fireEvent.mouseDown(screen.getByTestId('content'), {
      button: 0,
      shiftKey: true,
      clientX: 20,
      clientY: 30,
    });
    fireEvent.mouseMove(document, { clientX: 50, clientY: 60 });
    fireEvent.mouseUp(document, { clientX: 50, clientY: 60 });

    expect(useGanttStore.getState().selectedTaskIds).toEqual(['existing', 'hit']);
  });

  it('cancels the marquee without changing selection on escape', () => {
    useGanttStore.setState({
      flatTasks: [createTask({ id: 'hit', $x: 15, $y: 15, $w: 10, $h: 10 })],
      selectedTaskIds: ['existing'],
    });

    render(<MarqueeHarness />);
    mockScrollBounds();

    fireEvent.mouseDown(screen.getByTestId('content'), {
      button: 0,
      clientX: 20,
      clientY: 30,
    });
    fireEvent.mouseMove(document, { clientX: 50, clientY: 60 });
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseUp(document, { clientX: 50, clientY: 60 });

    expect(useGanttStore.getState().selectedTaskIds).toEqual(['existing']);
  });

  it('does not start from a task bar target', () => {
    useGanttStore.setState({
      flatTasks: [createTask({ id: 'hit', $x: 15, $y: 15, $w: 10, $h: 10 })],
      selectedTaskIds: ['existing'],
    });

    render(<MarqueeHarness />);
    mockScrollBounds();

    fireEvent.mouseDown(screen.getByTestId('task-bar'), {
      button: 0,
      clientX: 20,
      clientY: 30,
    });
    fireEvent.mouseMove(document, { clientX: 50, clientY: 60 });
    fireEvent.mouseUp(document, { clientX: 50, clientY: 60 });

    expect(useGanttStore.getState().selectedTaskIds).toEqual(['existing']);
  });
});
