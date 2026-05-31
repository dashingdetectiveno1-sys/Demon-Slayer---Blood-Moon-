/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum NodeState {
  RUNNING,
  SUCCESS,
  FAILURE,
}

export abstract class BTNode {
  abstract tick(): NodeState;
}

export class Sequence extends BTNode {
  private children: BTNode[];
  private currentIndex: number = 0;

  constructor(children: BTNode[]) {
    super();
    this.children = children;
  }

  tick(): NodeState {
    while (this.currentIndex < this.children.length) {
      const status = this.children[this.currentIndex].tick();

      if (status === NodeState.RUNNING) {
        return NodeState.RUNNING;
      }
      if (status === NodeState.FAILURE) {
        this.currentIndex = 0;
        return NodeState.FAILURE;
      }
      // If success, move to next child
      this.currentIndex++;
    }

    this.currentIndex = 0;
    return NodeState.SUCCESS;
  }
}

export class Selector extends BTNode {
  private children: BTNode[];
  private currentIndex: number = 0;

  constructor(children: BTNode[]) {
    super();
    this.children = children;
  }

  tick(): NodeState {
    while (this.currentIndex < this.children.length) {
      const status = this.children[this.currentIndex].tick();

      if (status === NodeState.RUNNING) {
        return NodeState.RUNNING;
      }
      if (status === NodeState.SUCCESS) {
        this.currentIndex = 0;
        return NodeState.SUCCESS;
      }
      // If failure, move to next child
      this.currentIndex++;
    }

    this.currentIndex = 0;
    return NodeState.FAILURE;
  }
}

export class Task extends BTNode {
  private action: () => NodeState;

  constructor(action: () => NodeState) {
    super();
    this.action = action;
  }

  tick(): NodeState {
    return this.action();
  }
}

export class RandomSelector extends BTNode {
  private children: BTNode[];

  constructor(children: BTNode[]) {
    super();
    this.children = children;
  }

  tick(): NodeState {
    const r = Math.floor(Math.random() * this.children.length);
    return this.children[r].tick();
  }
}

// Example NPC Schema integration
export interface NPCSchema {
  id: string;
  name: string;
  persona: string;
  currentTask: string;
  behaviorTree: BTNode;
}
